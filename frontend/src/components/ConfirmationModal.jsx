import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useModalTransition } from "../hooks/useModalTransition";
import { tooltip } from "./tooltip";
import Modal from "./Modal";

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
  const titleId = useId();
  const descriptionId = useId();
  const { isClosing, closeWithTransition } = useModalTransition();

  const close = () => {
    if (!submittingRef.current) closeWithTransition(onClose);
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

  return (
    <Modal
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-md bg-white"
      isClosing={isClosing}
      onClose={close}
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
    </Modal>
  );
}

export default ConfirmationModal;
