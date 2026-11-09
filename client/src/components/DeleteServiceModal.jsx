import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useModalTransition } from "../hooks/useModalTransition";
import { deleteService } from "../services/serviceService";
import { tooltip } from "./tooltip";

function DeleteServiceModal({ service, onClose, onDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const { isClosing, closeWithTransition } = useModalTransition();

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const close = () => {
    if (!submittingRef.current) closeWithTransition(onClose);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
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
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleDelete = async () => {
    if (submittingRef.current || isClosing) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await deleteService(service.id);
      toast.success("Service deleted successfully.");
      closeWithTransition(() => onDeleted(service));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete service.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 ${
        isClosing ? "modal-closing" : ""
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-service-title"
        aria-describedby="delete-service-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="delete-service-title" className="text-xl font-semibold text-slate-800">
              Delete Service
            </h2>
            <p id="delete-service-description" className="mt-1 wrap-break-word text-sm text-slate-500">
              Delete service &quot;{service.title}&quot;? This action cannot be undone.
            </p>
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
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={submitting || isClosing}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting || isClosing}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Deleting..." : "Delete Service"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteServiceModal;
