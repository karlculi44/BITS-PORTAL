// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
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
});

afterEach(() => {
  cleanup();
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
});
