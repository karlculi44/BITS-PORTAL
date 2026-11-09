// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import ScrollProgress from "./ScrollProgress";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.scrolling;
});

describe("ScrollProgress", () => {
  it("shows the page scrollbar while scrolling and hides it after scrolling stops", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<ScrollProgress />);

    fireEvent.scroll(window);
    expect(document.documentElement.dataset.scrolling).toBe("true");

    vi.advanceTimersByTime(799);
    expect(document.documentElement.dataset.scrolling).toBe("true");

    vi.advanceTimersByTime(1);
    expect(document.documentElement.dataset.scrolling).toBeUndefined();
  });
});
