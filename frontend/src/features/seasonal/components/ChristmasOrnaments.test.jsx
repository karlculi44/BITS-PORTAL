// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import ChristmasOrnaments from "./ChristmasOrnaments";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChristmasOrnaments", () => {
  it("does not reserve space when disabled or empty", () => {
    const { container, rerender } = render(<ChristmasOrnaments enabled={false} />);
    expect(container.firstChild).toBeNull();
    rerender(<ChristmasOrnaments count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses configured colors, dimensions, animation and placement", () => {
    const { container } = render(
      <ChristmasOrnaments
        placement="admin"
        count={3}
        colors={["red", "gold"]}
        sizes={[20, 30]}
        hangingLengths={[10, 25]}
        animationSpeed={4}
        swingAmplitude={5}
        animationIntensity={2}
      />,
    );
    const band = container.firstChild;
    const ornaments = band.querySelectorAll(".christmas-ornament");
    expect(band.getAttribute("aria-hidden")).toBe("true");
    expect(band.classList.contains("christmas-ornaments--admin")).toBe(true);
    expect(band.style.getPropertyValue("--ornaments-height")).toBe("71px");
    expect(ornaments).toHaveLength(3);
    expect(ornaments[1].style.getPropertyValue("--ornament-color")).toBe("gold");
    expect(ornaments[1].style.getPropertyValue("--ornament-size")).toBe("30px");
    expect(ornaments[1].style.getPropertyValue("--ornament-string")).toBe("25px");
    expect(ornaments[0].style.getPropertyValue("--ornament-duration")).toBe("4s");
    expect(ornaments[0].style.getPropertyValue("--ornament-swing")).toBe("9deg");
    expect(ornaments[1].style.getPropertyValue("--ornament-swing")).toBe("-10deg");
    expect(ornaments[2].style.getPropertyValue("--ornament-color")).toBe("red");
  });

  it("limits the number of rendered ornaments", () => {
    const { container } = render(<ChristmasOrnaments count={100} />);
    expect(container.querySelectorAll(".christmas-ornament")).toHaveLength(12);
  });

  it("swings ornaments independently and settles after the pointer leaves", () => {
    vi.stubGlobal("PointerEvent", class extends MouseEvent {
      constructor(type, options = {}) {
        super(type, options);
        this.pointerType = options.pointerType;
      }
    });
    const { container } = render(<ChristmasOrnaments count={2} />);
    const ornaments = container.querySelectorAll(".christmas-ornament");
    const baubles = container.querySelectorAll(".christmas-ornament-bauble");

    fireEvent.pointerOver(baubles[0], { pointerType: "mouse" });
    expect(ornaments[0].classList.contains("christmas-ornament--swinging")).toBe(true);
    expect(ornaments[1].classList.contains("christmas-ornament--swinging")).toBe(false);
    fireEvent.pointerOut(baubles[0], { pointerType: "mouse" });
    expect(ornaments[0].classList.contains("christmas-ornament--swinging")).toBe(true);

    const touch = new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true, cancelable: true });
    expect(baubles[1].dispatchEvent(touch)).toBe(true);
    expect(ornaments[1].classList.contains("christmas-ornament--swinging")).toBe(true);
    fireEvent(ornaments[0], new Event("webkitAnimationEnd", { bubbles: true }));
    expect(ornaments[0].classList.contains("christmas-ornament--swinging")).toBe(false);
    expect(ornaments[1].classList.contains("christmas-ornament--swinging")).toBe(true);
    fireEvent(ornaments[1], new Event("webkitAnimationEnd", { bubbles: true }));
    fireEvent.pointerOver(baubles[0], { pointerType: "mouse" });
    expect(ornaments[0].classList.contains("christmas-ornament--swinging")).toBe(true);
  });

  it("restarts only the clicked ornament with randomized direction and duration", () => {
    const random = vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1).mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9).mockReturnValueOnce(1);
    const { container } = render(<ChristmasOrnaments count={2} />);
    const ornaments = container.querySelectorAll(".christmas-ornament");
    const baubles = container.querySelectorAll(".christmas-ornament-bauble");

    fireEvent.click(baubles[0]);
    expect(ornaments[0].classList.contains("christmas-ornament--swinging")).toBe(true);
    expect(ornaments[0].style.getPropertyValue("--ornament-direction")).toBe("-1");
    expect(ornaments[0].style.getPropertyValue("--ornament-speed-factor")).toBe("0.75");
    expect(ornaments[1].classList.contains("christmas-ornament--swinging")).toBe(false);

    fireEvent.click(baubles[0]);
    expect(ornaments[0].style.getPropertyValue("--ornament-direction")).toBe("1");
    expect(ornaments[0].style.getPropertyValue("--ornament-speed-factor")).toBe("1.25");
    expect(random).toHaveBeenCalledTimes(4);
    fireEvent(ornaments[0], new Event("webkitAnimationEnd", { bubbles: true }));
    expect(ornaments[0].style.getPropertyValue("--ornament-start")).toBe("");
    expect(ornaments[0].style.getPropertyValue("--ornament-speed-factor")).toBe("");
  });

  it("does not react when interaction is disabled or reduced motion is requested", () => {
    vi.stubGlobal("PointerEvent", class extends MouseEvent {
      constructor(type, options = {}) {
        super(type, options);
        this.pointerType = options.pointerType;
      }
    });
    const { container, rerender } = render(<ChristmasOrnaments interactive={false} />);
    let bauble = container.querySelector(".christmas-ornament-bauble");
    fireEvent.pointerOver(bauble, { pointerType: "mouse" });
    fireEvent.pointerDown(bauble, { pointerType: "touch" });
    fireEvent.click(bauble);
    expect(container.querySelector(".christmas-ornament--swinging")).toBeNull();
    expect(bauble.classList.contains("christmas-ornament-bauble--interactive")).toBe(false);

    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    rerender(<ChristmasOrnaments />);
    bauble = container.querySelector(".christmas-ornament-bauble");
    fireEvent.pointerOver(bauble, { pointerType: "mouse" });
    const touch = new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true, cancelable: true });
    expect(bauble.dispatchEvent(touch)).toBe(true);
    fireEvent.click(bauble);
    expect(container.querySelector(".christmas-ornament--swinging")).toBeNull();
  });
});
