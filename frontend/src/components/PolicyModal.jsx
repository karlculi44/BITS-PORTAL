import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { tooltip } from "./tooltip";
import { useModalTransition } from "../hooks/useModalTransition";
import { createPolicy, updatePolicy } from "../services/policyService";
import Modal from "./Modal";

const maxPolicyDocumentSize = 10 * 1024 * 1024;
const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const formValues = (policy) => ({
  category_id: policy?.category_id?.toString() || "",
  title: policy?.title || "",
  description: policy?.description || "",
});

const documentName = (file) =>
  typeof file === "string" ? file.split(/[\\/]/).pop() : "";

function PolicyModal({ policy, categories, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm({ defaultValues: formValues(policy) });
  const categoryId = useWatch({ control, name: "category_id" });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const documentInputRef = useRef(null);
  const { isClosing, closeWithTransition } = useModalTransition();
  const isEditing = !!policy;

  const close = () => {
    if (!submittingRef.current) closeWithTransition(onClose);
  };

  const selectDocument = (file) => {
    if (!file) return;
    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("document", {
        type: "validate",
        message: "Choose a PDF document.",
      });
      return;
    }
    if (file.size > maxPolicyDocumentSize) {
      setError("document", {
        type: "validate",
        message: "Policy documents must be 10 MB or smaller.",
      });
      return;
    }
    setSelectedDocument(file);
    clearErrors("document");
  };

  const submitPolicy = async (form) => {
    if (submittingRef.current) return;
    if (!isEditing && !selectedDocument) {
      setError("document", {
        type: "required",
        message: "Select a PDF policy document.",
      });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    const payload = new FormData();
    payload.append("category_id", String(Number(form.category_id)));
    payload.append("title", form.title.trim());
    payload.append("description", form.description.trim());
    if (selectedDocument) payload.append("document", selectedDocument);

    try {
      if (policy) {
        await updatePolicy(policy.id, payload);
      } else {
        await createPolicy(payload);
      }
      toast.success(
        policy
          ? "Policy updated successfully."
          : "Policy created successfully.",
      );
      closeWithTransition(onSaved);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save policy.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const categoryField = register("category_id", {
    required: "Select a policy category.",
    validate: (value) =>
      categories.some(
        (category) =>
          category.type === "policy" && String(category.id) === value,
      ) || "Select an available policy category.",
  });

  return (
    <Modal
      titleId="policy-modal-title"
      descriptionId="policy-modal-description"
      className="max-w-2xl bg-slate-50"
      isClosing={isClosing}
      onClose={close}
    >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="policy-modal-title"
              className="text-xl font-semibold text-slate-800"
            >
              {isEditing ? "Edit Policy" : "Register New Policy"}
            </h2>
            <p
              id="policy-modal-description"
              className="mt-1 text-sm text-slate-500"
            >
              {isEditing
                ? "Update the policy information and document."
                : "Add a policy document and organize it under the appropriate category."}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="Close modal"
            {...tooltip("Close", "left")}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => handleSubmit(submitPolicy)(event)}
          noValidate
          className="mt-6 space-y-4"
        >
          <label className="block text-sm font-medium text-slate-700">
            Policy Category
            <select
              {...categoryField}
              value={categoryId}
              required
              aria-invalid={!!errors.category_id}
              aria-describedby={
                errors.category_id ? "policy-category-error" : undefined
              }
              disabled={submitting}
              className={fieldClass}
            >
              <option value="">Select a category</option>
              {categories
                .filter((category) => category.type === "policy")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          {errors.category_id && (
            <p
              id="policy-category-error"
              role="alert"
              className="text-sm text-red-700"
            >
              {errors.category_id.message}
            </p>
          )}
          {categories.length === 0 && (
            <p className="text-sm text-slate-500">
              No policy categories are available. Add one from Categories first.
            </p>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Policy Title
            <input
              {...register("title", {
                required: "Policy title is required.",
                validate: (value) =>
                  !!value.trim() || "Policy title is required.",
                maxLength: {
                  value: 255,
                  message: "Policy title must be at most 255 characters.",
                },
              })}
              maxLength={255}
              required
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "policy-title-error" : undefined}
              disabled={submitting}
              className={fieldClass}
            />
          </label>
          {errors.title && (
            <p
              id="policy-title-error"
              role="alert"
              className="text-sm text-red-700"
            >
              {errors.title.message}
            </p>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              {...register("description")}
              rows={4}
              disabled={submitting}
              className={fieldClass}
              placeholder="Add an optional description"
            />
          </label>

          <div>
            <label
              htmlFor="policy-document"
              className="block text-sm font-medium text-slate-700"
            >
              Policy Document
            </label>
            <input
              ref={documentInputRef}
              id="policy-document"
              type="file"
              accept=".pdf,application/pdf"
              aria-invalid={!!errors.document}
              aria-describedby={
                errors.document ? "policy-document-error" : undefined
              }
              disabled={submitting}
              onChange={(event) => selectDocument(event.target.files?.[0])}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              {selectedDocument?.name ||
                (policy?.file
                  ? `Current document: ${documentName(policy.file)}`
                  : "PDF only, up to 10 MB.")}
            </p>
            {errors.document && (
              <p
                id="policy-document-error"
                role="alert"
                className="mt-1 text-sm text-red-700"
              >
                {errors.document.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || categories.length === 0}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Policy"}
            </button>
          </div>
        </form>
    </Modal>
  );
}

export default PolicyModal;
