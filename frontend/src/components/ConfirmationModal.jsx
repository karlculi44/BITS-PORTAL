import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useModalTransition } from "../hooks/useModalTransition";
import { tooltip } from "./tooltip";

function ConfirmationModal({
  title,
  message,
  confirmLabel,
  pendingLabel,
  errorMessage,
  onConfirm,
  onClose,
  onSuccess,
  destructive = true,
}) {
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const { isClosing, closeWithTransition } = useModalTransition();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const root = document.documentElement;
    const body = document.body;
    const previousOverflowX = root.style.getPropertyValue("overflow-x");
    const previousOverflowY = root.style.getPropertyValue("overflow-y");
    const overflowXPriority = root.style.getPropertyPriority("overflow-x");
    const overflowYPriority = root.style.getPropertyPriority("overflow-y");
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    const padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    const background = document.querySelector(".app-shell") || previousFocus?.closest("body > div");
    const wasInert = background?.inert;

    window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: "instant" });
    root.style.overflow = "hidden";
    if (scrollbarWidth && root.clientWidth) {
      body.style.paddingRight = `${padding + scrollbarWidth}px`;
    }
    if (background) background.inert = true;
    dialogRef.current?.focus();

    const keepFocusInDialog = (event) => {
      if (!dialogRef.current?.contains(event.target)) dialogRef.current?.focus();
    };
    document.addEventListener("focusin", keepFocusInDialog);
    return () => {
      document.removeEventListener("focusin", keepFocusInDialog);
      root.style.removeProperty("overflow");
      if (previousOverflowX) root.style.setProperty("overflow-x", previousOverflowX, overflowXPriority);
      if (previousOverflowY) root.style.setProperty("overflow-y", previousOverflowY, overflowYPriority);
      body.style.paddingRight = previousPadding;
      if (background) background.inert = wasInert;
      previousFocus?.focus();
    };
  }, []);

  const close = () => {
    if (!submittingRef.current) closeWithTransition(onClose);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current.querySelectorAll("button:not(:disabled)");
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleConfirm = async () => {
    if (submittingRef.current || isClosing) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onConfirm();
      closeWithTransition(onSuccess);
    } catch (error) {
      toast.error(error.response?.data?.message || errorMessage);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className={`modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 ${isClosing ? "modal-closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
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
        className="confirmation-dialog max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold text-slate-800">{title}</h2>
            <p id={descriptionId} className="mt-1 wrap-break-word text-sm text-slate-500">{message}</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting || isClosing}
            aria-label="Close modal"
            {...tooltip("Close", "left")}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={close} disabled={submitting || isClosing} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || isClosing}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${destructive ? "bg-red-800 hover:bg-red-900" : "bg-blue-700 hover:bg-blue-800"}`}
          >
            {submitting ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmationModal;
