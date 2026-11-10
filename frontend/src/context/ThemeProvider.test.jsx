// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./themeContext";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.stubGlobal("CSS", { registerProperty: vi.fn(), supports: () => true });
});

afterEach(() => {
  cleanup();
  delete document.startViewTransition;
  delete document.documentElement.dataset.themeTransition;
  delete document.documentElement.dataset.themeTransitionCapture;
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("restores and persists a manually selected theme", () => {
    window.localStorage.setItem("bits-portal-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button").textContent).toBe("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("light");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("follows system changes until the user selects a theme", async () => {
    let updateSystemTheme;
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: (_event, listener) => {
        updateSystemTheme = listener;
      },
      removeEventListener: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("light");

    updateSystemTheme({ matches: true });
    await waitFor(() =>
      expect(screen.getByRole("button").textContent).toBe("dark"),
    );

    fireEvent.click(screen.getByRole("button"));
    updateSystemTheme({ matches: true });
    expect(screen.getByRole("button").textContent).toBe("light");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("light");
  });

  it("captures both themes and ignores repeated clicks until the transition finishes", async () => {
    let update;
    let resolveReady;
    let resolveFinished;
    const ready = new Promise((resolve) => {
      resolveReady = resolve;
    });
    const finished = new Promise((resolve) => {
      resolveFinished = resolve;
    });
    document.startViewTransition = vi.fn((callback) => {
      update = callback;
      return { ready, finished };
    });

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => update());
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeTransitionCapture).toBe("true");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("dark");
    await act(async () => resolveReady());
    expect(document.documentElement.dataset.themeTransitionCapture).toBeUndefined();
    fireEvent.click(button);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);

    await act(async () => resolveFinished());
    expect(document.documentElement.dataset.themeTransition).toBeUndefined();
    fireEvent.click(button);
    expect(document.startViewTransition).toHaveBeenCalledTimes(2);
    act(() => update());
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("switches immediately when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", (query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    document.startViewTransition = vi.fn();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("dark");
  });

  it("switches immediately when the animation CSS is unsupported", () => {
    vi.stubGlobal("CSS", { supports: () => false });
    document.startViewTransition = vi.fn();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("falls back to an immediate switch when starting a transition fails", () => {
    document.startViewTransition = vi.fn(() => {
      throw new Error("Transition unavailable");
    });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeTransition).toBeUndefined();
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });
});
