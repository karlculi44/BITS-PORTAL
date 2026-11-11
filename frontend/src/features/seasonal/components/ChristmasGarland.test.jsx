// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import ChristmasGarland from "./ChristmasGarland";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChristmasGarland", () => {
  it("does not render when disabled", () => {
    const { container } = render(<ChristmasGarland enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a configurable, non-interactive garland that responds to width changes", () => {
    let width = 560;
    let onResize;
    const disconnect = vi.fn();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ width }));
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback) { onResize = callback; }
      observe() {}
      disconnect() { disconnect(); }
    });

    const { container, unmount } = render(
      <ChristmasGarland
        density={1}
        thickness={20}
        curvature={8}
        opacity={0.75}
        placement="bottom"
      />,
    );
    const garland = container.firstChild;
    expect(garland.getAttribute("aria-hidden")).toBe("true");
    expect(garland.classList.contains("christmas-garland--bottom")).toBe(true);
    expect(garland.style.getPropertyValue("--garland-height")).toBe("32px");
    expect(garland.style.getPropertyValue("--garland-opacity")).toBe("0.75");
    expect(garland.querySelectorAll(".christmas-garland-cluster")).toHaveLength(10);
    expect(garland.querySelectorAll(".christmas-garland-needles").length).toBeGreaterThan(0);

    width = 1120;
    act(() => onResize());
    expect(garland.querySelectorAll(".christmas-garland-cluster")).toHaveLength(20);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("limits density to avoid excessive branch rendering", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ width: 560 }));

    const { container } = render(<ChristmasGarland density={100} />);

    expect(container.querySelectorAll(".christmas-garland-cluster")).toHaveLength(20);
  });
});
