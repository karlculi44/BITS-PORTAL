// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import { ThemeProvider } from "../context/ThemeProvider";
import PageTransition from "../components/PageTransition";
import ScrollToTop from "../components/ScrollToTop";
import PublicLayout from "../layouts/PublicLayout";
import AboutPage from "./AboutPage";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  motion: {
    div: ({ onAnimationComplete, initial, animate, transition, ...props }) => {
      void initial;
      void animate;
      void transition;
      return <div {...props} data-testid={props.className === "page-transition" ? "wipe" : "page"} onTransitionEnd={() => onAnimationComplete?.(animate)} />;
    },
  },
}));

function renderSite(path = "/about") {
  window.scrollTo = vi.fn();
  return render(
    <AuthContext.Provider value={{ user: null, loading: false }}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <PageTransition publicRoutes={[{ path: "/" }, { path: "/about" }]}>
            <ScrollToTop />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<h1>Home page</h1>} />
                <Route path="/about" element={<AboutPage />} />
              </Route>
            </Routes>
          </PageTransition>
        </MemoryRouter>
      </ThemeProvider>
    </AuthContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("About page", () => {
  it("presents the department's purpose, objectives, strategies and tactics", () => {
    renderSite();
    expect(screen.getByRole("heading", { name: "About BITS" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Information Technology Section logo" }).getAttribute("src"))
      .toContain("ITS_logo.png");
    expect(screen.getByText("A catalyst of good governance through Information Technology.")).toBeTruthy();
    expect(screen.getByText("To expand connectivity within the next three years to deliver accessible streamlined services.")).toBeTruthy();
    for (const [heading, count] of [["Objectives", 2], ["Strategy", 9], ["Tactics", 8]]) {
      const section = screen.getByRole("region", { name: heading });
      expect(within(section).getAllByRole("listitem")).toHaveLength(count);
    }
    expect(screen.getByText(/construction of the BIT Hub/)).toBeTruthy();
    expect(screen.getByText(/technology talks with Network, Hardware, and Admin/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "About" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("navigates with the transition, restores scroll, and supports both themes", () => {
    renderSite("/");
    const header = screen.getByRole("banner");
    const footer = screen.getByRole("contentinfo");
    const outlet = screen.getByTestId("page");
    expect(outlet.contains(header)).toBe(false);
    expect(outlet.contains(footer)).toBe(false);
    window.scrollTo.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    expect(screen.getByRole("heading", { name: "Home page" })).toBeTruthy();
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.getByRole("heading", { name: "About BITS" })).toBeTruthy();
    expect(screen.getByRole("banner")).toBe(header);
    expect(screen.getByRole("contentinfo")).toBe(footer);
    expect(screen.getByTestId("page")).not.toBe(outlet);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.queryByTestId("wipe")).toBeNull();

    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    fireEvent.transitionEnd(screen.getByTestId("page"));
    expect(screen.getByRole("heading", { name: "Home page" })).toBeTruthy();
  });
});
