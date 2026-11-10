// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { AuthContext } from "../context/authContextValue";
import { ThemeProvider } from "../context/ThemeProvider";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import * as authService from "../services/authService";
import { getAccessToken, setAccessToken } from "../services/api";
import { getServices } from "../services/dashboardService";
import { getServiceCategories } from "../services/serviceService";
import PublicLandingPage from "./PublicLandingPage";

vi.mock("../services/dashboardService", () => ({
  getServices: vi.fn(),
}));

vi.mock("../services/serviceService", async (importOriginal) => ({
  ...await importOriginal(),
  getServiceCategories: vi.fn(),
}));

vi.mock("../services/authService", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  refresh: vi.fn(),
  googleLogin: vi.fn(),
}));

const services = [
  {
    id: 1,
    title: "Business Permit",
    description: "Apply online for a business permit",
    category_id: 1,
    image: "https://example.com/permit.png",
    url: "https://services.example.gov/permit",
  },
  {
    id: 2,
    title: "Water Billing",
    description: "Pay your water bill online",
    category_id: 2,
    url: "https://services.example.gov/water",
  },
  {
    id: 3,
    title: "Business Support",
    description: "Guidance for local business",
    category_id: 1,
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: index + 4,
    title: `City Service ${index + 4}`,
    description: "Information for residents",
    category_id: index % 2 ? 2 : 1,
    url: `https://services.example.gov/${index + 4}`,
  })),
];

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthContext.Provider value={{ user: null, loading: false }}>
          <PublicLandingPage />
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function AuthControls() {
  const { login, logout } = useAuth();
  return (
    <>
      <button onClick={() => login({ username: "test", password: "password" })}>
        Test login
      </button>
      <button onClick={() => logout()}>Test logout</button>
    </>
  );
}

function renderLandingWithAuth() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <ThemeProvider>
          <AuthControls />
          <Routes>
            <Route path="/" element={<PublicLandingPage />} />
            <Route path="/login" element={<h1>Login page</h1>} />
            <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  getServices.mockResolvedValue(services);
  getServiceCategories.mockResolvedValue([
    { id: 1, name: "Business", type: "service" },
    { id: 2, name: "Utilities", type: "service" },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  setAccessToken(null);
  delete document.documentElement.dataset.theme;
});

describe("Public landing page", () => {
  it.each(["/dashboard", "/services", "/users"])(
    "returns from %s to the homepage without signing out",
    async (path) => {
      authService.refresh.mockResolvedValue({
        data: { id: 1, role: "admin", profile_image: "/api/users/images/avatar.png" },
        accessToken: "session-token",
      });
      const onClose = vi.fn();
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <ThemeProvider>
              <Routes>
                <Route path="/" element={<PublicLandingPage />} />
                <Route path="*" element={<Sidebar open onClose={onClose} />} />
              </Routes>
            </ThemeProvider>
          </MemoryRouter>
        </AuthProvider>,
      );
      await waitFor(() => expect(getAccessToken()).toBe("session-token"));

      const homepageLink = screen.getByRole("link", { name: "Return to Homepage" });
      expect(homepageLink.getAttribute("href")).toBe("/");
      expect(homepageLink.hasAttribute("data-page-transition")).toBe(true);
      fireEvent.click(homepageLink);

      expect(onClose).toHaveBeenCalledOnce();
      const profileLink = screen.getByRole("link", { name: "Go to dashboard" });
      expect(profileLink.querySelector("img").getAttribute("src")).toBe(
        `${window.location.origin}/api/users/images/avatar.png`,
      );
      expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
      expect(authService.logout).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe("session-token");
    },
  );

  it("waits for an unauthenticated session before showing the login link", async () => {
    let rejectRefresh;
    authService.refresh.mockReturnValue(new Promise((_, reject) => {
      rejectRefresh = reject;
    }));
    renderLandingWithAuth();

    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Go to dashboard" })).toBeNull();
    await act(async () => rejectRefresh({ response: { status: 401 } }));

    const loginLink = screen.getByRole("link", { name: "Login" });
    expect(loginLink.getAttribute("href")).toBe("/login");
    fireEvent.click(loginLink);
    expect(screen.getByRole("heading", { name: "Login page" })).toBeTruthy();
  });

  it("waits for a restored session and navigates to the dashboard", async () => {
    let resolveRefresh;
    authService.refresh.mockReturnValue(new Promise((resolve) => {
      resolveRefresh = resolve;
    }));
    renderLandingWithAuth();

    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Go to dashboard" })).toBeNull();
    await act(async () => resolveRefresh({
      data: { id: 1, role: "staff", profile_image: "/api/users/images/avatar.png" },
      accessToken: "restored-token",
    }));

    const profileLink = screen.getByRole("link", { name: "Go to dashboard" });
    expect(profileLink.getAttribute("href")).toBe("/dashboard");
    expect(profileLink.hasAttribute("data-page-transition")).toBe(true);
    expect(profileLink.querySelector("img").getAttribute("src")).toBe(
      `${window.location.origin}/api/users/images/avatar.png`,
    );
    expect(profileLink.querySelector("img").getAttribute("alt")).toBe("");
    expect(profileLink.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
    fireEvent.click(profileLink);
    expect(screen.getByRole("heading", { name: "Dashboard page" })).toBeTruthy();
  });

  it("falls back for missing or failed profile pictures and displays an updated picture", () => {
    const renderPage = (user) => (
      <MemoryRouter>
        <ThemeProvider>
          <AuthContext.Provider value={{ user, loading: false }}>
            <PublicLandingPage />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );
    const user = { id: 1, role: "staff" };
    const { rerender } = render(renderPage(user));
    const profileLink = screen.getByRole("link", { name: "Go to dashboard" });
    expect(profileLink.querySelector("svg")).toBeTruthy();
    expect(profileLink.querySelector("img")).toBeNull();

    rerender(renderPage({ ...user, profile_image: "/missing.png" }));
    fireEvent.error(profileLink.querySelector("img"));
    expect(profileLink.querySelector("img")).toBeNull();
    expect(profileLink.querySelector("svg")).toBeTruthy();

    rerender(renderPage({ ...user, profile_image: "/new.png" }));
    expect(profileLink.querySelector("img").getAttribute("src")).toBe(
      `${window.location.origin}/new.png`,
    );
    expect(profileLink.querySelector("svg")).toBeNull();
  });

  it("updates the navbar when the shared auth state logs in and out", async () => {
    authService.refresh.mockRejectedValue({ response: { status: 401 } });
    authService.login.mockResolvedValue({
      data: { id: 1, role: "staff" },
      accessToken: "login-token",
    });
    authService.logout.mockResolvedValue({});
    renderLandingWithAuth();

    await screen.findByRole("link", { name: "Login" });
    fireEvent.click(screen.getByRole("button", { name: "Test login" }));
    await screen.findByRole("link", { name: "Go to dashboard" });
    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Test logout" }));
    await screen.findByRole("link", { name: "Login" });
    expect(screen.queryByRole("link", { name: "Go to dashboard" })).toBeNull();
  });

  it("switches the welcome section with the site theme", async () => {
    window.localStorage.setItem("bits-portal-theme", "dark");
    renderLandingPage();

    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(screen.getByRole("heading", { name: "Welcome to BITS Portal" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "A city moving forward" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  });

  it("tilts only the identity card toward the cursor and resets on leave", async () => {
    renderLandingPage();
    const card = screen.getByText("A city moving forward").closest(".public-identity-card");
    const surface = card.parentElement.parentElement;
    const wrapper = surface.parentElement;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
    });

    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseMove(wrapper, { clientX: 200, clientY: 0 });

    await waitFor(() => {
      const rotation = Number(surface.style.transform.match(/rotateY\(([-.\d]+)deg\)/)[1]);
      expect(rotation).toBeGreaterThan(5.8);
      expect(rotation).toBeLessThanOrEqual(6);
    });
    expect(surface.style.transform).toContain("scale(1.01)");
    const glare = surface.querySelector("[data-tilt-glare]");
    expect(glare.style.opacity).toBe("0.2");
    expect(glare.style.pointerEvents).toBe("none");
    expect(wrapper.style.touchAction).not.toBe("none");
    expect(document.querySelectorAll("[data-tilt-glare]")).toHaveLength(1);

    fireEvent.mouseLeave(wrapper);
    await waitFor(() => {
      expect(surface.style.transform).toContain("rotateX(0deg) rotateY(0deg)");
    }, { timeout: 2000 });
    expect(surface.style.transform).not.toContain("scale");
    expect(glare.style.opacity).toBe("0");
    expect(surface.style.transition).not.toContain("transform");
  });

  it("disables and resets tilt when reduced motion is requested", async () => {
    const motionChanges = [];
    vi.stubGlobal("matchMedia", vi.fn((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: (event, listener) => {
        if (query === "(prefers-reduced-motion: reduce)") motionChanges.push(listener);
      },
      removeEventListener: vi.fn(),
    })));
    renderLandingPage();
    const card = screen.getByText("A city moving forward").closest(".public-identity-card");
    const surface = card.parentElement.parentElement;
    const wrapper = surface.parentElement;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
    });

    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseMove(wrapper, { clientX: 200, clientY: 0 });
    expect(surface.style.transform).toContain("rotateX(0deg) rotateY(0deg)");
    expect(surface.querySelector("[data-tilt-glare]").style.opacity).toBe("0");

    act(() => motionChanges.forEach((listener) => listener({ matches: false })));
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseMove(wrapper, { clientX: 200, clientY: 0 });
    await waitFor(() => {
      const rotation = Number(surface.style.transform.match(/rotateY\(([-.\d]+)deg\)/)[1]);
      expect(rotation).toBeGreaterThan(5.8);
    });
    act(() => motionChanges.forEach((listener) => listener({ matches: true })));
    expect(surface.style.transform).toContain("rotateX(0deg) rotateY(0deg)");
    expect(surface.querySelector("[data-tilt-glare]").style.opacity).toBe("0");
  });

  it("loads public services and opens external destinations securely", async () => {
    renderLandingPage();

    expect(await screen.findByText("Business Permit")).toBeTruthy();
    expect(getServices).toHaveBeenCalledOnce();
    expect(getServiceCategories).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "BITS Portal home" }).querySelector("img").getAttribute("src"),
    ).toContain("bits.png");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current"))
      .toBe("page");
    expect(screen.getByText("About").getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByRole("button", { name: /profile|account/i })).toBeNull();

    const permitLink = screen.getByRole("link", {
      name: "Open Business Permit service in a new tab",
    });
    expect(permitLink.getAttribute("href")).toBe(
      "https://services.example.gov/permit",
    );
    expect(permitLink.getAttribute("target")).toBe("_blank");
    expect(permitLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("img", { name: "Business Permit logo" })).toBeTruthy();
  });

  it("combines category and search filters", async () => {
    renderLandingPage();
    await screen.findByText("Business Permit");

    fireEvent.change(screen.getByLabelText("Filter by category"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Search services"), {
      target: { value: "permit" },
    });

    expect(screen.getByText("Business Permit")).toBeTruthy();
    expect(screen.queryByText("Business Support")).toBeNull();
    expect(screen.queryByText("Water Billing")).toBeNull();
    expect(screen.getByRole("option", { name: "All Categories" })).toBeTruthy();
    expect(screen.getAllByText("1–1")).toHaveLength(2);
    expect(screen.getAllByText("1", { selector: "strong" })).toHaveLength(2);
  });

  it("supports page sizing, navigation, and resets pagination after filtering", async () => {
    renderLandingPage();
    await screen.findByText("Business Permit");

    expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Next page (top)" }));
    expect(screen.getByText("City Service 7")).toBeTruthy();
    expect(screen.getAllByText("Page 2 of 2")).toHaveLength(2);
    expect(document.querySelector(".public-service-grid-enter-next")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Previous page (bottom)" }).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Previous page (bottom)" }));
    expect(screen.getAllByText("Page 2 of 2")).toHaveLength(2);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Previous page (bottom)" }).disabled)
        .toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous page (bottom)" }));
    expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
    expect(document.querySelector(".public-service-grid-enter-previous")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next page (bottom)" }).disabled)
        .toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page (bottom)" }));
    expect(screen.getAllByText("Page 2 of 2")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Services per page (bottom)"), {
      target: { value: "9" },
    });
    expect(screen.getAllByLabelText("Services per page (top)")[0].value).toBe("9");
    expect(screen.getAllByText("Page 1 of 1")).toHaveLength(2);
    expect(screen.getAllByText("City Service 7")).toHaveLength(2);
    expect(
      document.querySelectorAll(".public-service-item-curtain-enter"),
    ).toHaveLength(2);

    await waitFor(() =>
      expect(screen.getAllByText("City Service 7")).toHaveLength(1),
    );
    fireEvent.change(screen.getByLabelText("Services per page (top)"), {
      target: { value: "6" },
    });
    expect(screen.getAllByLabelText("Services per page (bottom)")[0].value).toBe("6");
    expect(
      document.querySelectorAll(".public-service-item-curtain-exit"),
    ).toHaveLength(2);
    await waitFor(() =>
      expect(document.querySelectorAll(".public-service-grid")).toHaveLength(1),
    );
    fireEvent.change(screen.getByLabelText("Search services"), {
      target: { value: "water" },
    });
    expect(screen.getAllByText("Page 1 of 1")).toHaveLength(2);
    expect(screen.getByText("Water Billing")).toBeTruthy();
    expect(screen.queryByText("Business Permit")).toBeNull();
  });

  it("navigates immediately with reduced motion through both pagination controls", async () => {
    vi.stubGlobal("matchMedia", vi.fn((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    renderLandingPage();
    await screen.findByText("Business Permit");

    fireEvent.click(screen.getByRole("button", { name: "Next page (bottom)" }));
    expect(screen.getAllByText("Page 2 of 2")).toHaveLength(2);
    expect(document.querySelectorAll(".public-service-grid")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Previous page (top)" }));
    expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
    expect(document.querySelectorAll(".public-service-grid")).toHaveLength(1);
  });

  it("cancels a swipe when filters change", async () => {
    renderLandingPage();
    await screen.findByText("Business Permit");
    fireEvent.click(screen.getByRole("button", { name: "Next page (top)" }));
    fireEvent.change(screen.getByLabelText("Search services"), {
      target: { value: "business" },
    });

    expect(document.querySelectorAll(".public-service-grid")).toHaveLength(1);
    expect(screen.getAllByText("Page 1 of 1")).toHaveLength(2);
    expect(screen.getByText("Business Permit")).toBeTruthy();
    expect(screen.getByText("Business Support")).toBeTruthy();
    expect(screen.queryByText("City Service 7")).toBeNull();
  });

  it("cancels a swipe when reduced motion is enabled", async () => {
    const motionChanges = [];
    vi.stubGlobal("matchMedia", vi.fn((query) => ({
      matches: false,
      addEventListener: (event, listener) => {
        if (query === "(prefers-reduced-motion: reduce)") motionChanges.push(listener);
      },
      removeEventListener: vi.fn(),
    })));
    renderLandingPage();
    await screen.findByText("Business Permit");
    fireEvent.click(screen.getByRole("button", { name: "Next page (top)" }));
    expect(document.querySelectorAll(".public-service-grid")).toHaveLength(2);

    act(() => motionChanges.forEach((listener) => listener({ matches: true })));
    expect(document.querySelectorAll(".public-service-grid")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Previous page (bottom)" }).disabled)
      .toBe(false);
  });

  it("uses the shared persistent theme toggle", async () => {
    renderLandingPage();
    await screen.findByText("Business Permit");

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("dark");
  });
});
