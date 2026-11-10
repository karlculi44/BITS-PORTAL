import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const openModals = [];
let restorePage;
let pageFocus;

function saveStyles(element, properties) {
  const saved = properties.map((property) => [
    property,
    element.style.getPropertyValue(property),
    element.style.getPropertyPriority(property),
  ]);
  return () => {
    saved.forEach(([property, value, priority]) => {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    });
  };
}

function lockPage() {
  const root = document.documentElement;
  const body = document.body;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const restoreRoot = saveStyles(root, ["overflow", "overflow-x", "overflow-y"]);
  const restoreBody = saveStyles(body, [
    "position", "top", "left", "right", "width", "padding-right",
  ]);
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
  const background = document.querySelector(".app-shell");
  const wasInert = background?.inert;

  window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
  root.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = `-${scrollX}px`;
  body.style.right = "0";
  body.style.width = "100%";
  if (scrollbarWidth && root.clientWidth) {
    body.style.paddingRight = `${padding + scrollbarWidth}px`;
  }
  if (background) background.inert = true;

  return () => {
    root.style.removeProperty("overflow");
    restoreRoot();
    restoreBody();
    if (background) background.inert = wasInert;
    window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
  };
}

function syncModalStack() {
  openModals.forEach((modal, index) => {
    modal.backdrop.inert = index !== openModals.length - 1;
    modal.backdrop.style.zIndex = String(100 + index);
  });
}

function Modal({ children, className, titleId, descriptionId, isClosing, onClose }) {
  const backdropRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const modal = { backdrop: backdropRef.current, dialog: dialogRef.current };
    if (!openModals.length) {
      pageFocus = previousFocus;
      restorePage = lockPage();
    }
    openModals.push(modal);
    syncModalStack();
    modal.dialog.focus();

    const keepFocusInTopModal = (event) => {
      const top = openModals[openModals.length - 1];
      if (top === modal && !top.dialog.contains(event.target)) top.dialog.focus();
    };
    document.addEventListener("focusin", keepFocusInTopModal);

    return () => {
      document.removeEventListener("focusin", keepFocusInTopModal);
      const index = openModals.indexOf(modal);
      const wasTop = index === openModals.length - 1;
      openModals.splice(index, 1);
      syncModalStack();
      const top = openModals[openModals.length - 1];
      if (!top) {
        restorePage();
        restorePage = undefined;
      }
      if (wasTop) {
        if (previousFocus?.isConnected && (!top || top.dialog.contains(previousFocus))) {
          previousFocus.focus({ preventScroll: true });
        } else if (!top && pageFocus?.isConnected) {
          pageFocus.focus({ preventScroll: true });
        } else {
          top?.dialog.focus();
        }
      }
      if (!top) pageFocus = undefined;
    };
  }, []);

  const handleKeyDown = (event) => {
    if (openModals[openModals.length - 1]?.dialog !== dialogRef.current) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialogRef.current.querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => {
      if (element.closest("[hidden], [inert]")) return false;
      for (let node = element; node && node !== dialogRef.current; node = node.parentElement) {
        const style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
      }
      return true;
    });
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) {
      event.preventDefault();
      dialogRef.current.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className={`modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 ${isClosing ? "modal-closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && openModals[openModals.length - 1]?.dialog === dialogRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`modal-dialog max-h-full w-full overflow-y-auto overscroll-contain rounded-lg p-6 shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
