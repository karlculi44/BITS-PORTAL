// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Logo from "./Logo";
import { getServiceLogoUrl } from "../services/serviceService";
import informationTechnologyLogo from "../assets/images/ITS_logo.png";
import { inspectCircularArtwork } from "./logoArtwork";

vi.mock("./logoArtwork", () => ({ inspectCircularArtwork: vi.fn(() => null) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Logo", () => {
  it("resolves default and missing service images to the bundled BITS logo", () => {
    expect(getServiceLogoUrl("bits-default")).toContain("bits-trimmed.png");
    expect(getServiceLogoUrl(null)).toBe(getServiceLogoUrl("bits-default"));
    expect(getServiceLogoUrl("  ")).toBe(getServiceLogoUrl("bits-default"));
  });

  it("falls back after an image fails and recovers when the source changes", () => {
    const { rerender } = render(<Logo src="https://example.com/logo.png" alt="Service logo" />);
    const image = screen.getByRole("img", { name: "Service logo" });
    expect(image.getAttribute("src")).toBe("https://example.com/logo.png");
    expect(image.parentElement.classList.contains("logo")).toBe(true);
    fireEvent.error(image);
    expect(screen.getByRole("img", { name: "Service logo" }).getAttribute("src")).toContain("bits-trimmed.png");
    expect(screen.getByRole("img", { name: "Service logo" }).parentElement.classList.contains("logo--circular")).toBe(true);
    fireEvent.error(screen.getByRole("img", { name: "Service logo" }));
    expect(screen.getByRole("img", { name: "Service logo" }).tagName).toBe("SPAN");
    rerender(<Logo src="https://example.com/other.png" alt="Service logo" />);
    expect(screen.getByRole("img", { name: "Service logo" }).getAttribute("src")).toBe("https://example.com/other.png");
  });

  it("uses the full circular treatment for known seals", () => {
    render(<Logo src={informationTechnologyLogo} alt="ITS logo" />);
    expect(screen.getByRole("img", { name: "ITS logo" }).parentElement.classList.contains("logo--circular")).toBe(true);
  });

  it("fits rectangular custom images inside the circle without cropping", () => {
    render(<Logo src="https://example.com/rectangle.png" alt="Custom logo" />);
    const image = screen.getByRole("img", { name: "Custom logo" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 400 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 200 });
    fireEvent.load(image);
    const width = parseFloat(image.style.width);
    const height = parseFloat(image.style.height);
    expect(width / height).toBeCloseTo(2);
    expect(Math.hypot(width, height)).toBeCloseTo(99);
    expect(width).toBeGreaterThan(80);
    expect(image.parentElement.classList.contains("logo--circular")).toBe(false);
  });

  it("fills the container for a detected circular service logo and resets for a new image", () => {
    inspectCircularArtwork.mockReturnValueOnce(98).mockReturnValueOnce(null);
    const { rerender } = render(<Logo src="/round.png" alt="Service logo" />);
    const image = screen.getByRole("img", { name: "Service logo" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 128 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 128 });
    fireEvent.load(image);
    expect(image.parentElement.classList.contains("logo--circular")).toBe(true);
    expect(image.style.width).toBe("98%");
    rerender(<Logo src="/square.png" alt="Service logo" />);
    expect(image.parentElement.classList.contains("logo--circular")).toBe(false);
    fireEvent.load(image);
    expect(image.parentElement.classList.contains("logo--circular")).toBe(false);
    expect(parseFloat(image.style.width)).toBeCloseTo(70);
  });
});
