// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ConfirmationModal from "./ConfirmationModal";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ConfirmationModal", () => {
  it("portals above the page, locks and restores scrolling and focus, and traps keyboard focus", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const root = document.documentElement;
    const body = document.body;
    const oldOverflow = root.style.overflow;
    const oldPadding = body.style.paddingRight;
    root.style.overflowX = "clip";
    root.style.overflowY = "auto";
    body.style.paddingRight = "5px";
    vi.spyOn(root, "clientWidth", "get").mockReturnValue(1000);
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1015);
    const onClose = vi.fn();
    const { container, unmount } = render(
      <div className="app-shell"><button>Trigger</button></div>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    trigger.focus();
    const modal = render(
      <ConfirmationModal title="Delete Item" message="Delete this item?" confirmLabel="Delete" pendingLabel="Deleting..." errorMessage="Failed" onConfirm={vi.fn()} onClose={onClose} onSuccess={vi.fn()} />,
    );
    const dialog = screen.getByRole("dialog", { name: "Delete Item" });
    expect(dialog.parentElement.parentElement).toBe(body);
    expect(container.firstChild.inert).toBe(true);
    expect(root.style.overflow).toBe("hidden");
    expect(scrollTo).toHaveBeenCalledWith({ left: window.scrollX, top: window.scrollY, behavior: "instant" });
    expect(body.style.paddingRight).toBe("20px");
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Delete" }));
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Close modal" }));
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    modal.unmount();
    expect(root.style.overflowX).toBe("clip");
    expect(root.style.overflowY).toBe("auto");
    expect(body.style.paddingRight).toBe("5px");
    expect(container.firstChild.inert).toBeFalsy();
    expect(document.activeElement).toBe(trigger);
    unmount();
    root.style.overflow = oldOverflow;
    body.style.paddingRight = oldPadding;
  });
});
