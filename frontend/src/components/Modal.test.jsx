// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Modal from "./Modal";

function TestModal({ name, onClose = () => {} }) {
  const titleId = `${name.replaceAll(" ", "-")}-title`;
  return (
    <Modal titleId={titleId} className="max-w-md bg-white" onClose={onClose}>
      <h2 id={titleId}>{name}</h2>
      <button>First</button>
      <button>Last</button>
    </Modal>
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Modal", () => {
  it("portals, traps focus, and restores the page scroll and existing styles", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(320);
    const root = document.documentElement;
    const body = document.body;
    root.style.overflowY = "scroll";
    body.style.position = "relative";
    const { container } = render(<div className="app-shell"><button>Open</button></div>);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    const onClose = vi.fn();
    const modal = render(<TestModal name="First dialog" onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement;

    expect(backdrop.parentElement).toBe(body);
    expect(backdrop.className).toContain("fixed inset-0");
    expect(dialog.className).toContain("max-h-full");
    expect(dialog.className).toContain("overflow-y-auto");
    expect(container.firstChild.inert).toBe(true);
    expect(root.style.overflow).toBe("hidden");
    expect(body.style.position).toBe("fixed");
    expect(body.style.top).toBe("-320px");
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByText("Last"));
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(within(dialog).getByText("First"));
    trigger.focus();
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    modal.unmount();
    expect(root.style.overflowY).toBe("scroll");
    expect(body.style.position).toBe("relative");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 320, behavior: "instant" });
    expect(container.firstChild.inert).toBeFalsy();
    expect(document.activeElement).toBe(trigger);
    root.style.removeProperty("overflow-y");
    body.style.removeProperty("position");
  });

  it("keeps the page locked and only the top dialog interactive when modals overlap", () => {
    const { container } = render(<div className="app-shell"><button>Open</button></div>);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    const first = render(<TestModal name="First dialog" />);
    const firstDialog = screen.getByRole("dialog", { name: "First dialog" });
    within(firstDialog).getByText("First").focus();
    const secondClose = vi.fn();
    const second = render(<TestModal name="Second dialog" onClose={secondClose} />);
    const secondDialog = screen.getByRole("dialog", { name: "Second dialog" });
    expect(firstDialog.parentElement.inert).toBe(true);
    expect(secondDialog.parentElement.inert).toBe(false);
    expect(Number(secondDialog.parentElement.style.zIndex)).toBeGreaterThan(Number(firstDialog.parentElement.style.zIndex));

    first.unmount();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(container.firstChild.inert).toBe(true);
    expect(document.activeElement).toBe(secondDialog);
    fireEvent.keyDown(secondDialog, { key: "Escape" });
    expect(secondClose).toHaveBeenCalledTimes(1);
    second.unmount();
    expect(document.documentElement.style.overflow).not.toBe("hidden");
    expect(container.firstChild.inert).toBeFalsy();
    expect(document.activeElement).toBe(trigger);
  });
});
