// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import ChristmasLights from "./ChristmasLights";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChristmasLights", () => {
  it("does not render when disabled", () => {
    const { container } = render(<ChristmasLights enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("sizes the string to its container and applies configurable appearance", () => {
    let width = 640;
    let onResize;
    const disconnect = vi.fn();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ width }));
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback) { onResize = callback; }
      observe() {}
      disconnect() { disconnect(); }
    });

    const { container, unmount } = render(
      <ChristmasLights
        bulbSize={14}
        bulbSpacing={80}
        glowIntensity={0.5}
        animationSpeed={4}
        colors={["red", "blue"]}
        wireCurvature={6}
        placement="bottom"
      />,
    );
    const lights = container.firstChild;
    expect(lights.getAttribute("aria-hidden")).toBe("true");
    expect(lights.classList.contains("christmas-lights--bottom")).toBe(true);
    expect(lights.style.getPropertyValue("--configured-bulb-size")).toBe("14px");
    expect(lights.style.getPropertyValue("--glow-intensity")).toBe("0.5");
    expect(lights.querySelectorAll(".christmas-lights-bulb")).toHaveLength(9);
    expect(lights.querySelector("path").getAttribute("d")).toBe("M 0 3 Q 50 15 100 3");
    const bulbs = lights.querySelectorAll(".christmas-lights-bulb");
    expect(bulbs[0].style.getPropertyValue("--bulb-color")).toBe("red");
    expect(bulbs[1].style.getPropertyValue("--bulb-color")).toBe("blue");
    expect(bulbs[0].style.getPropertyValue("--twinkle-delay")).not.toBe(
      bulbs[1].style.getPropertyValue("--twinkle-delay"),
    );
    expect(bulbs[0].style.getPropertyValue("--twinkle-duration")).not.toBe(
      bulbs[1].style.getPropertyValue("--twinkle-duration"),
    );

    width = 1200;
    act(() => onResize());
    expect(lights.querySelectorAll(".christmas-lights-bulb")).toHaveLength(15);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
