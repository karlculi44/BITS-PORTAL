// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getCircularArtworkScale, inspectCircularArtwork } from "./logoArtwork";

function pixelsFor(size, isArtwork) {
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      pixels[index + 3] = 255;
      const value = isArtwork(x, y) ? 0 : 255;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
    }
  }
  return pixels;
}

describe("service logo artwork", () => {
  it("recognizes circular artwork and preserves white or transparent corners", () => {
    const size = 128;
    const pixels = pixelsFor(size, (x, y) => Math.hypot(x - 63.5, y - 63.5) < 60);
    expect(getCircularArtworkScale(pixels, size)).toBe(99.7);
    pixels[3] = 0;
    expect(getCircularArtworkScale(pixels, size)).toBe(99.7);
  });

  it("keeps artwork extending into the corners and empty images safely contained", () => {
    const size = 128;
    expect(getCircularArtworkScale(pixelsFor(size, () => true), size)).toBeNull();
    expect(getCircularArtworkScale(pixelsFor(size, () => false), size)).toBeNull();
  });

  it("scales slightly off-center circular artwork to avoid clipping", () => {
    const size = 128;
    const pixels = pixelsFor(size, (x, y) => Math.hypot(x - 64.5, y - 64.5) < 63);
    expect(getCircularArtworkScale(pixels, size)).toBeGreaterThan(95);
    expect(getCircularArtworkScale(pixels, size)).toBeLessThan(99.7);
  });

  it("does not inspect rectangular images and reports inaccessible cross-origin images", () => {
    expect(inspectCircularArtwork({ naturalWidth: 400, naturalHeight: 200 })).toBeNull();
    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => { throw new DOMException("Tainted canvas", "SecurityError"); }),
    };
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(inspectCircularArtwork({ naturalWidth: 100, naturalHeight: 100, currentSrc: "https://example.com/logo.png" })).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    getContext.mockRestore();
    warn.mockRestore();
  });
});
