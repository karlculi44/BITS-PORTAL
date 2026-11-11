// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ChristmasOrnaments from "./ChristmasOrnaments";

afterEach(cleanup);

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
    expect(ornaments[0].style.getPropertyValue("--ornament-swing")).toBe("2deg");
    expect(ornaments[2].style.getPropertyValue("--ornament-color")).toBe("red");
  });

  it("limits the number of rendered ornaments", () => {
    const { container } = render(<ChristmasOrnaments count={100} />);
    expect(container.querySelectorAll(".christmas-ornament")).toHaveLength(12);
  });
});
