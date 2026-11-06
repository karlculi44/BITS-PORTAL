import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { tooltip } from "./tooltip";
import { createCategory, updateCategory } from "../services/categoryService";

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const formValues = (category) => ({ name: category?.name || "" });

function CategoryModal({ category, type, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: formValues(category) });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const typeLabel = type === "policy" ? "Policy" : "Service";

  useEffect(() => {
    reset(formValues(category));
  }, [category, reset]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && !submittingRef.current) {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submitCategory = async (form) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const name = form.name.trim();

    try {
      if (category) {
        await updateCategory(category.id, { name });
      } else {
        await createCategory({ name, type });
      }
      toast.success(
        category
          ? "Category updated successfully."
          : "Category created successfully.",
      );
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save category.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submittingRef.current)
          onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        aria-describedby="category-modal-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="category-modal-title"
              className="text-xl font-semibold text-slate-800"
            >
              {category
                ? `Edit ${typeLabel} Category`
                : `Add ${typeLabel} Category`}
            </h2>
            <p
              id="category-modal-description"
              className="mt-1 text-sm text-slate-500"
            >
              {category
                ? `Update the details of this existing ${typeLabel.toLowerCase()} category.`
                : `Add a new ${typeLabel.toLowerCase()} category to the BITS Portal.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            {...tooltip("Close", "left")}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => handleSubmit(submitCategory)(event)}
          noValidate
          className="mt-6 space-y-4"
        >
          <label className="block text-sm font-medium text-slate-700">
            Category Name
            <input
              {...register("name", {
                validate: (value) =>
                  !!value.trim() || "Category name is required.",
              })}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              disabled={submitting}
              className={fieldClass}
            />
          </label>
          {errors.name && (
            <p id="name-error" role="alert" className="text-sm text-red-700">
              {errors.name.message}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : category
                  ? "Save Changes"
                  : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;
