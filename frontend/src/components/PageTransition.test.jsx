// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import PageTransition from "./PageTransition";
import ProtectedRoute from "./ProtectedRoute";

const motionSettings = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", () => ({
  useReducedMotion: () => motionSettings.reduced,
  motion: {
    div: ({ onAnimationComplete, ...props }) => {
      const { initial, animate, transition, ...domProps } = props;
      void initial;
      void animate;
      void transition;
      return <div {...domProps} data-testid="transition" onTransitionEnd={onAnimationComplete} />;
    },
  },
}));

function HistoryControls() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
}

function renderRoutes({ path = "/", user = { role: "admin" }, entries } = {}) {
  return render(
    <AuthContext.Provider value={{ user, loading: false }}>
      <MemoryRouter initialEntries={entries || [path]} initialIndex={entries ? entries.length - 1 : 0}>
        <PageTransition>
          <HistoryControls />
          <Routes>
            <Route path="/" element={<><h1>Home</h1><Link to="/dashboard" data-page-transition>Profile</Link></>} />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <h1>Dashboard</h1><Link to="/" data-page-transition>Return to Homepage</Link>
              </ProtectedRoute>
            } />
            <Route path="/login" element={<h1>Login</h1>} />
            <Route path="/other" element={<h1>Other</h1>} />
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
    ["/", "Profile", "Home", "Dashboard"],
    ["/dashboard", "Return to Homepage", "Dashboard", "Home"],
  ])("covers %s before navigating and then reveals the destination", (path, link, outgoing, destination) => {
    renderRoutes({ path });
    fireEvent.click(screen.getByRole("link", { name: link }));
    expect(screen.getByRole("heading", { name: outgoing })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: destination })).toBeNull();
    const overlay = screen.getByTestId("transition");
    expect(overlay.getAttribute("aria-hidden")).toBe("true");

    fireEvent.transitionEnd(overlay);
    expect(screen.getByRole("heading", { name: destination })).toBeTruthy();
    expect(screen.getByTestId("transition")).toBeTruthy();
    fireEvent.transitionEnd(overlay);
    expect(screen.queryByTestId("transition")).toBeNull();
  });

  it("keeps the dashboard protected when the session is unavailable", () => {
    renderRoutes({ user: null });
    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    fireEvent.transitionEnd(screen.getByTestId("transition"));
    expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy();
    fireEvent.transitionEnd(screen.getByTestId("transition"));
    expect(screen.queryByTestId("transition")).toBeNull();
  });

  it("navigates immediately with reduced motion", () => {
    motionSettings.reduced = true;
    renderRoutes();
    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.queryByTestId("transition")).toBeNull();
  });

  it("leaves direct and history navigation unanimated and cancels a pending wipe", () => {
    renderRoutes({ entries: ["/other", "/"] });
    expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Other" })).toBeTruthy();
    expect(screen.queryByTestId("transition")).toBeNull();
  });

  it("does not intercept modified clicks or allow duplicate navigations", () => {
    renderRoutes();
    const link = screen.getByRole("link", { name: "Profile" });
    const modifiedClick = vi.fn((event) => {
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
    });
    link.addEventListener("click", modifiedClick, { once: true });
    fireEvent.click(link, { ctrlKey: true });
    expect(modifiedClick).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("transition")).toBeNull();
    fireEvent.click(link);
    fireEvent.click(link);
    const overlay = screen.getByTestId("transition");
    fireEvent.transitionEnd(overlay);
    fireEvent.transitionEnd(overlay);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
  });
});
