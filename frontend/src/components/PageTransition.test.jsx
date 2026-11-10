// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import PageTransition from "./PageTransition";
import ProtectedRoute from "./ProtectedRoute";
import PublicOutletTransition from "./PublicOutletTransition";
import Login from "../pages/Login";
import Sidebar from "./Sidebar";
import ScrollToTop from "./ScrollToTop";
import { useAuth } from "../hooks/useAuth";

const motionSettings = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", () => ({
  useReducedMotion: () => motionSettings.reduced,
  motion: {
    div: ({ onAnimationComplete, initial, animate, transition, children, ...props }) => (
      <div
        {...props}
        data-testid={props.className === "page-transition" ? "wipe" : "page"}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-duration={transition.duration}
        onTransitionEnd={() => onAnimationComplete?.(animate)}
      >
        {children}
      </div>
    ),
  },
}));

const publicRoutes = [{ path: "/" }, { path: "/about" }, { path: "/policies" }, { path: "/login" }, { path: "/other" }];

function HistoryControls() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
}

function PublicTestLayout() {
  return <PublicOutletTransition><Outlet /></PublicOutletTransition>;
}

function AuthenticatedHome() {
  const { user } = useAuth();
  return <h1>Home {user.role}</h1>;
}

function renderRoutes({ path = "/", user = { role: "admin" }, entries } = {}) {
  return render(
    <AuthContext.Provider value={{ user, loading: false, login: vi.fn().mockResolvedValue(user) }}>
      <MemoryRouter initialEntries={entries || [path]} initialIndex={entries ? entries.length - 1 : 0}>
        <HistoryControls />
        <PageTransition publicRoutes={publicRoutes}>
          <Routes>
            <Route element={<PublicTestLayout />}>
              <Route path="/" element={<><h1>Home</h1><Link to="/about">About</Link><Link to="/dashboard">Profile</Link><Link to="/login">Login</Link><a href="#services">Services anchor</a></>} />
              <Route path="/about" element={<><h1>About</h1><Link to="/">Home</Link><Link to="/policies">Policies</Link><Link to="/dashboard">Dashboard</Link></>} />
              <Route path="/policies" element={<><h1>Policies</h1><Link to="/">Home</Link><Link to="/dashboard">Dashboard</Link></>} />
              <Route path="/login" element={<><h1>Login</h1><Login /></>} />
              <Route path="/other" element={<h1>Other</h1>} />
            </Route>
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <h1>Dashboard</h1><Link to="/">Return to Homepage</Link>
              </ProtectedRoute>
            } />
          </Routes>
        </PageTransition>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  motionSettings.reduced = false;
});

describe("PageTransition", () => {
  it.each([
    "/dashboard",
    "/services",
    "/policies",
    "/categories",
    "/users",
    "/activity-logs",
    "/future-admin-page",
  ])("wipes from the admin sidebar on %s and restores scroll", (path) => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const user = { role: "admin" };
    render(
      <AuthContext.Provider value={{ user, loading: false }}>
        <MemoryRouter initialEntries={[path]}>
          <ScrollToTop />
          <PageTransition publicRoutes={[{ path: "/" }, { path: "/about" }]}>
            <Routes>
              <Route path="/" element={<AuthenticatedHome />} />
              <Route path="*" element={<><Sidebar open onClose={() => {}} /><h1>Admin page</h1></>} />
            </Routes>
          </PageTransition>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "Return to Homepage" }));
    expect(screen.getByRole("heading", { name: "Admin page" })).toBeTruthy();
    const overlay = screen.getByTestId("wipe");
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.getAttribute("data-duration")).toBe("0.38");
    fireEvent.transitionEnd(overlay);
    expect(screen.getByRole("heading", { name: "Home admin" })).toBeTruthy();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
    expect(screen.getByTestId("wipe").getAttribute("data-duration")).toBe("0.3");
    fireEvent.transitionEnd(screen.getByTestId("wipe"));
    expect(screen.queryByTestId("wipe")).toBeNull();
    scrollTo.mockRestore();
  });

  it("respects reduced motion for the admin sidebar return", () => {
    motionSettings.reduced = true;
    render(
      <AuthContext.Provider value={{ user: { role: "admin" }, loading: false }}>
        <MemoryRouter initialEntries={["/services"]}>
          <PageTransition publicRoutes={[{ path: "/" }]}>
            <Routes>
              <Route path="/" element={<h1>Home</h1>} />
              <Route path="/services" element={<Sidebar open onClose={() => {}} />} />
            </Routes>
          </PageTransition>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Return to Homepage" }));
    expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
    expect(screen.queryByTestId("wipe")).toBeNull();
  });

  it.each([
    ["/", "Profile", "Home", "Dashboard"],
    ["/about", "Dashboard", "About", "Dashboard"],
    ["/policies", "Dashboard", "Policies", "Dashboard"],
    ["/dashboard", "Return to Homepage", "Dashboard", "Home"],
  ])("wipes between home and dashboard from %s", (path, link, outgoing, destination) => {
    renderRoutes({ path });
    fireEvent.click(screen.getByRole("link", { name: link }));
    expect(screen.getByRole("heading", { name: outgoing })).toBeTruthy();
    const overlay = screen.getByTestId("wipe");
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.getAttribute("data-duration")).toBe("0.38");
    fireEvent.transitionEnd(overlay);
    expect(screen.getByRole("heading", { name: destination })).toBeTruthy();
    expect(screen.getByTestId("wipe").getAttribute("data-duration")).toBe("0.3");
    fireEvent.transitionEnd(screen.getByTestId("wipe"));
    expect(screen.queryByTestId("wipe")).toBeNull();
  });

  it.each([
    ["/", "About", "Home", "About"],
    ["/about", "Home", "About", "Home"],
    ["/about", "Policies", "About", "Policies"],
    ["/policies", "Home", "Policies", "Home"],
    ["/", "Login", "Home", "Login"],
  ])("fades public navigation from %s", (path, link, outgoing, destination) => {
    renderRoutes({ path });
    fireEvent.click(screen.getByRole("link", { name: link }));
    expect(screen.getByRole("heading", { name: outgoing })).toBeTruthy();
    expect(screen.queryByTestId("wipe")).toBeNull();
    expect(screen.getByTestId("page").getAttribute("data-animate")).toBe('{"opacity":0}');
    expect(screen.getByTestId("page").getAttribute("data-duration")).toBe("0.12");
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.getByRole("heading", { name: destination })).toBeTruthy();
    expect(screen.getByTestId("page").getAttribute("data-initial")).toBe('{"opacity":0,"y":12}');
    expect(screen.getByTestId("page").getAttribute("data-animate")).toBe('{"opacity":1,"y":0}');
    expect(screen.getByTestId("page").getAttribute("data-duration")).toBe("0.15");
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.queryByTestId("wipe")).toBeNull();
  });

  it.each([false, true])("uses a dashboard transition after login (reduced motion: %s)", async (reduced) => {
    motionSettings.reduced = reduced;
    renderRoutes({ path: "/login" });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    if (reduced) {
      expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
      expect(screen.queryByTestId("wipe")).toBeNull();
    } else {
      await waitFor(() => expect(screen.getByTestId("wipe")).toBeTruthy());
      expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy();
      fireEvent.transitionEnd(screen.getByTestId("wipe"));
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
      fireEvent.transitionEnd(screen.getByTestId("wipe"));
      expect(screen.queryByTestId("wipe")).toBeNull();
    }
  });

  it("starts the login wipe even if the public fade is still revealing", async () => {
    renderRoutes();
    fireEvent.click(screen.getByRole("link", { name: "Login" }));
    fireEvent.transitionEnd(screen.getByTestId("page"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(screen.getByTestId("wipe")).toBeTruthy());
    fireEvent.transitionEnd(screen.getByTestId("wipe"));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    fireEvent.transitionEnd(screen.getByTestId("wipe"));
    expect(screen.queryByTestId("wipe")).toBeNull();
  });

  it("keeps the dashboard protected when the session is unavailable", () => {
    renderRoutes({ user: null });
    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    fireEvent.transitionEnd(screen.getByTestId("wipe"));
    expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy();
    fireEvent.transitionEnd(screen.getByTestId("wipe"));
  });

  it.each(["About", "Profile"])("navigates immediately with reduced motion: %s", (link) => {
    motionSettings.reduced = true;
    renderRoutes();
    fireEvent.click(screen.getByRole("link", { name: link }));
    expect(screen.getByRole("heading", { name: link === "Profile" ? "Dashboard" : "About" })).toBeTruthy();
    expect(screen.queryByTestId("wipe")).toBeNull();
    if (link === "About") {
      expect(screen.getByTestId("page").getAttribute("data-initial")).toBe("false");
    }
  });

  it.each(["About", "Profile"])("cancels a pending %s transition on history navigation", (link) => {
    renderRoutes({ entries: ["/other", "/"] });
    fireEvent.click(screen.getByRole("link", { name: link }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Other" })).toBeTruthy();
    expect(screen.queryByTestId("wipe")).toBeNull();
    expect(screen.getByTestId("page").getAttribute("data-animate")).toBe('{"opacity":1,"y":0}');
  });

  it("cancels a reveal on browser back", () => {
    renderRoutes();
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.getByRole("heading", { name: "About" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    expect(screen.getByTestId("page").getAttribute("data-animate")).toBe('{"opacity":0}');
  });

  it("ignores modified clicks and prevents overlapping transitions", () => {
    renderRoutes();
    const link = screen.getByRole("link", { name: "About" });
    const modifiedClick = vi.fn((event) => {
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
    });
    link.addEventListener("click", modifiedClick, { once: true });
    fireEvent.click(link, { ctrlKey: true });
    expect(modifiedClick).toHaveBeenCalledOnce();
    fireEvent.click(link);
    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.getByRole("heading", { name: "About" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(screen.getByRole("heading", { name: "About" })).toBeTruthy();
    fireEvent.transitionEnd(screen.getByTestId("page"));
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
  });
});
