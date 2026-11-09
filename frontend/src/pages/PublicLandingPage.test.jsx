// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeProvider";
import { getServices } from "../services/dashboardService";
import { getServiceCategories } from "../services/serviceService";
import PublicLandingPage from "./PublicLandingPage";

vi.mock("../services/dashboardService", () => ({
  getServices: vi.fn(),
}));

vi.mock("../services/serviceService", () => ({
  getServiceCategories: vi.fn(),
  getServiceImageUrl: (image) => image,
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
        <PublicLandingPage />
      </ThemeProvider>
    </MemoryRouter>,
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
  delete document.documentElement.dataset.theme;
});

describe("Public landing page", () => {
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
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Previous page (bottom)" }));
    expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
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

  it("uses the shared persistent theme toggle", async () => {
    renderLandingPage();
    await screen.findByText("Business Permit");

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("dark");
  });
});
