// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../context/ThemeProvider";
import { useTheme } from "../context/themeContext";
import ThemeToggle from "./ThemeToggle";

function ExternalControl() {
  const { setTheme } = useTheme();
  return <button onClick={() => setTheme("dark")}>External dark</button>;
}

const renderSwitch = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
      <ExternalControl />
    </ThemeProvider>,
  );

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("bits-portal-theme", "light");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeToggle switch", () => {
  it("reflects and persists the active theme", async () => {
    const user = userEvent.setup();
    renderSwitch();

    let toggle = screen.getByRole("switch", { name: "Switch to dark mode" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await user.click(toggle);
    toggle = screen.getByRole("switch", { name: "Switch to light mode" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("dark");

    await user.click(toggle);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(window.localStorage.getItem("bits-portal-theme")).toBe("light");
  });

  it("toggles with Space and Enter", async () => {
    const user = userEvent.setup();
    renderSwitch();
    const toggle = screen.getByRole("switch");

    toggle.focus();
    await user.keyboard("[Space]");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("stays in sync when the theme changes elsewhere", async () => {
    const user = userEvent.setup();
    renderSwitch();

    await user.click(screen.getByRole("button", { name: "External dark" }));
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("keeps both icons mounted through repeated theme changes", async () => {
    const user = userEvent.setup();
    const { container } = renderSwitch();
    const toggle = screen.getByRole("switch");
    const sun = container.querySelector(".theme-switch-sun");
    const moon = container.querySelector(".theme-switch-moon");

    await user.click(toggle);
    expect(container.querySelector(".theme-switch-sun")).toBe(sun);
    expect(container.querySelector(".theme-switch-moon")).toBe(moon);

    await user.click(toggle);
    expect(container.querySelector(".theme-switch-sun")).toBe(sun);
    expect(container.querySelector(".theme-switch-moon")).toBe(moon);
  });

  it("restores the selected theme when remounted", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSwitch();
    await user.click(screen.getByRole("switch"));

    unmount();
    renderSwitch();
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch").getAttribute("aria-label")).toBe("Switch to light mode");
  });
});
