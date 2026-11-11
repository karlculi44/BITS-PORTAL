// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import ChristmasSnowfall from "./ChristmasSnowfall";
import { adminChristmasSnowfall, publicChristmasSnowfall } from "../configs/christmas";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const particles = (container) => [...container.querySelectorAll(".christmas-snowfall-particle")];
const value = (particle, property) => parseFloat(particle.style.getPropertyValue(property));

describe("ChristmasSnowfall", () => {
  it("renders nothing when disabled", () => {
    const { container } = render(<ChristmasSnowfall enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders three distinct, bounded public layers with varied, stable particle paths", () => {
    const { container, rerender } = render(<ChristmasSnowfall {...publicChristmasSnowfall} />);
    expect(container.firstChild.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".christmas-snowfall-layer")).toHaveLength(3);
    expect(particles(container)).toHaveLength(116);
    for (const layer of publicChristmasSnowfall.layers) {
      const layerParticles = particles(container.querySelector(`.christmas-snowfall-layer--${layer.name}`));
      const element = container.querySelector(`.christmas-snowfall-layer--${layer.name}`);
      expect(element.dataset.depth).toBe(layer.depth);
      expect(element.dataset.area).toBe(layer.area);
      expect(layerParticles).toHaveLength(layer.count);
      for (const particle of layerParticles) {
        expect(value(particle, "--snow-size")).toBeGreaterThanOrEqual(layer.size[0]);
        expect(value(particle, "--snow-size")).toBeLessThanOrEqual(layer.size[1]);
        expect(value(particle, "--snow-duration")).toBeGreaterThanOrEqual(layer.duration[0]);
        expect(value(particle, "--snow-duration")).toBeLessThanOrEqual(layer.duration[1]);
        expect(value(particle, "--snow-opacity")).toBeGreaterThan(0);
        expect(value(particle, "--snow-opacity")).toBeLessThanOrEqual(layer.opacity);
        expect(value(particle, "--snow-drift")).toBeGreaterThanOrEqual(layer.drift[0]);
        expect(value(particle, "--snow-drift")).toBeLessThanOrEqual(layer.drift[1]);
        expect(value(particle, "--snow-delay")).toBeLessThan(0);
        expect(value(particle, "--snow-delay")).toBeGreaterThan(-value(particle, "--snow-duration"));
      }
    }
    const snow = particles(container);
    for (const property of ["left", "--snow-size", "--snow-duration", "--snow-delay", "--snow-drift"]) {
      const samples = snow.map((particle) => particle.style.getPropertyValue(property));
      expect(new Set(samples).size).toBe(snow.length);
    }
    expect(snow.some((particle) => value(particle, "--snow-drift") < 0)).toBe(true);
    expect(snow.some((particle) => value(particle, "--snow-drift") > 0)).toBe(true);
    const flakes = snow.filter((particle) => particle.classList.contains("christmas-snowfall-particle--flake"));
    expect(flakes.length).toBeGreaterThan(0);
    expect(flakes.length).toBeLessThan(snow.length / 2);
    const initialStyles = snow.map((particle) => particle.getAttribute("style"));
    rerender(<ChristmasSnowfall {...publicChristmasSnowfall} />);
    expect(particles(container).map((particle) => particle.getAttribute("style"))).toEqual(initialStyles);
  });

  it("keeps the admin preset smaller, slower and less visible", () => {
    const { container } = render(<ChristmasSnowfall {...adminChristmasSnowfall} />);
    expect(container.firstChild.classList.contains("christmas-snowfall--admin")).toBe(true);
    expect(particles(container)).toHaveLength(72);
    expect(particles(container).every((particle) => value(particle, "--snow-size") <= 7)).toBe(true);
    expect(particles(container).every((particle) => value(particle, "--snow-opacity") <= 0.45)).toBe(true);
    adminChristmasSnowfall.layers.forEach((layer, index) => {
      expect(layer.duration[0]).toBeGreaterThan(publicChristmasSnowfall.layers[index].duration[0]);
    });
  });

  it("adapts density only at viewport breakpoints and preserves retained particle paths", () => {
    let width = 1280;
    const listeners = new Set();
    const removeListener = vi.fn((_, callback) => listeners.delete(callback));
    vi.stubGlobal("matchMedia", (query) => ({
      matches: width <= (query.includes("640") ? 640 : 1024),
      addEventListener: (_, callback) => listeners.add(callback),
      removeEventListener: removeListener,
    }));
    const { container, unmount } = render(<ChristmasSnowfall {...publicChristmasSnowfall} />);
    const firstParticleStyle = particles(container)[0].getAttribute("style");
    expect(particles(container)).toHaveLength(116);
    width = 768;
    act(() => listeners.forEach((callback) => callback()));
    expect(particles(container)).toHaveLength(99);
    width = 390;
    act(() => listeners.forEach((callback) => callback()));
    expect(particles(container)).toHaveLength(75);
    expect(particles(container)[0].getAttribute("style")).toBe(firstParticleStyle);
    width = 1280;
    act(() => listeners.forEach((callback) => callback()));
    expect(particles(container)).toHaveLength(116);
    unmount();
    expect(removeListener).toHaveBeenCalledTimes(2);
  });

  it("distributes foreground snow across content with small, medium and larger flakes", () => {
    const { container } = render(<ChristmasSnowfall foreground={{ gutterWidth: "12px", clearTop: "8rem" }} />);
    expect(container.firstChild.style.getPropertyValue("--snow-gutter-width")).toBe("12px");
    expect(container.firstChild.style.getPropertyValue("--snow-clear-top")).toBe("8rem");
    const foreground = container.querySelector('[data-depth="foreground"]');
    expect(foreground.dataset.area).toBe("viewport");
    expect(foreground.childElementCount).toBe(28);
    const snow = particles(foreground);
    expect(snow.every((particle) => particle.style.left.endsWith("%"))).toBe(true);
    expect(snow.filter((particle) => parseFloat(particle.style.left) > 20 && parseFloat(particle.style.left) < 80).length).toBeGreaterThan(10);
    expect(snow.some((particle) => value(particle, "--snow-size") < 5)).toBe(true);
    expect(snow.some((particle) => value(particle, "--snow-size") > 9)).toBe(true);
    expect(snow.some((particle) => value(particle, "--snow-drift") < -10)).toBe(true);
    expect(snow.some((particle) => value(particle, "--snow-drift") > 10)).toBe(true);
    for (const layer of container.querySelectorAll('[data-depth="behind-content"]')) {
      expect(layer.dataset.area).toBe("viewport");
      expect(particles(layer).every((particle) => particle.style.left.endsWith("%"))).toBe(true);
    }
  });

  it("supports layer intensity, appearance, speed and animation configuration", () => {
    const { container, rerender } = render(
      <ChristmasSnowfall
        layers={[{
          name: "test", count: 10, size: [4, 4], opacity: 0.4,
          duration: [20, 20], drift: [30, 30], intensity: 0.5, flakeRatio: 1,
        }]}
        animation={{ enabled: false, speed: 2, driftDuration: [6, 6] }}
      />,
    );
    expect(container.firstChild.dataset.animated).toBe("false");
    expect(particles(container)).toHaveLength(5);
    for (const particle of particles(container)) {
      expect(value(particle, "--snow-size")).toBe(4);
      expect(value(particle, "--snow-opacity")).toBeLessThanOrEqual(0.2);
      expect(value(particle, "--snow-duration")).toBe(10);
      expect(value(particle, "--snow-drift")).toBe(30);
      expect(value(particle, "--snow-drift-duration")).toBe(3);
      expect(particle.classList.contains("christmas-snowfall-particle--flake")).toBe(true);
    }
    rerender(<ChristmasSnowfall layers={[{ ...publicChristmasSnowfall.layers[0], count: 1000 }]} />);
    expect(particles(container)).toHaveLength(48);
    rerender(<ChristmasSnowfall layers={[{ ...publicChristmasSnowfall.layers[0], intensity: 0 }]} />);
    expect(particles(container)).toHaveLength(0);
  });

  it("pauses on document visibility changes and cleans up the listener", () => {
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const removeListener = vi.spyOn(document, "removeEventListener");
    const { container, rerender, unmount } = render(<ChristmasSnowfall />);
    expect(container.firstChild.dataset.hidden).toBe("false");
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(container.firstChild.dataset.hidden).toBe("true");
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(container.firstChild.dataset.hidden).toBe("false");
    hidden = true;
    rerender(<ChristmasSnowfall animation={{ pauseWhenHidden: false }} />);
    expect(container.firstChild.dataset.hidden).toBe("false");
    expect(removeListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    unmount();
  });
});
