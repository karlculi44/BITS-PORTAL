// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

let navigate;
function Nav() {
  navigate = useNavigate();
  return null;
}

describe("ScrollToTop", () => {
  it("scrolls to top on pathname change only", () => {
    window.scrollTo = vi.fn();
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ScrollToTop />
        <Nav />
      </MemoryRouter>,
    );
    window.scrollTo.mockClear();

    act(() => navigate("/a?page=2"));
    expect(window.scrollTo).not.toHaveBeenCalled();

    act(() => navigate("/b"));
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  });
});
