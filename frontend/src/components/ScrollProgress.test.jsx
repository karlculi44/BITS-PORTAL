// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import { usePageLoading } from "../hooks/usePageLoading";
import PublicPoliciesPage from "../pages/PublicPoliciesPage";
import { getCategories } from "../services/categoryService";
import { getPolicies } from "../services/policyService";
import ScrollProgress from "./ScrollProgress";
import ScrollbarVisibility from "./ScrollbarVisibility";

vi.mock("../services/categoryService", () => ({ getCategories: vi.fn() }));
vi.mock("../services/policyService", () => ({
  getPolicies: vi.fn(),
  getPolicyDocument: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
  delete document.documentElement.dataset.scrolling;
});

function LoadingPage({ loading }) {
  usePageLoading(loading);
  return null;
}

function renderProgress(children, authLoading = false) {
  return render(
    <AuthContext.Provider value={{ user: null, loading: authLoading }}>
      <ScrollProgress />
      {children}
    </AuthContext.Provider>,
  );
}

describe("loading progress", () => {
  it("does not react to scrolling while preserving scrollbar visibility", () => {
    vi.useFakeTimers();
    renderProgress(<ScrollbarVisibility />);

    fireEvent.scroll(window);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(document.documentElement.dataset.scrolling).toBe("true");
    vi.advanceTimersByTime(800);
    expect(document.documentElement.dataset.scrolling).toBeUndefined();
  });

  it("tracks session restoration independently of page loading", () => {
    const { rerender } = renderProgress(null, true);
    expect(screen.getByRole("progressbar", { name: "Loading page" })).toBeTruthy();

    rerender(
      <AuthContext.Provider value={{ user: null, loading: true }}>
        <ScrollProgress />
        <LoadingPage loading />
      </AuthContext.Provider>,
    );
    rerender(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <ScrollProgress />
        <LoadingPage loading />
      </AuthContext.Provider>,
    );
    expect(screen.getByRole("progressbar")).toBeTruthy();
    rerender(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <ScrollProgress />
        <LoadingPage loading={false} />
      </AuthContext.Provider>,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("remains visible until all overlapping loads finish or unmount", () => {
    const { rerender } = renderProgress(
      <><LoadingPage loading /><LoadingPage loading /></>,
    );
    const bar = screen.getByRole("progressbar");
    fireEvent.scroll(window);
    expect(screen.getByRole("progressbar")).toBe(bar);
    expect(bar.getAttribute("style")).toBeNull();
    expect(bar.getAttribute("aria-valuenow")).toBeNull();

    rerender(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <ScrollProgress />
        <LoadingPage loading={false} /><LoadingPage loading />
      </AuthContext.Provider>,
    );
    expect(screen.getByRole("progressbar")).toBeTruthy();
    rerender(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <ScrollProgress />
      </AuthContext.Provider>,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it.each(["success", "failure"])("tracks destination page loading on %s", async (outcome) => {
    let finish;
    getCategories.mockResolvedValue([]);
    getPolicies.mockReturnValue(new Promise((resolve, reject) => {
      finish = outcome === "success" ? () => resolve([]) : () => reject(new Error("failed"));
    }));

    renderProgress(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Link to="/policies">Policies</Link>} />
          <Route path="/policies" element={<PublicPoliciesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Policies" }));
    expect(screen.getByRole("progressbar")).toBeTruthy();
    finish();
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
    if (outcome === "failure") {
      expect(screen.getByText("Unable to load the document library. Please try again.")).toBeTruthy();
    }
  });
});
