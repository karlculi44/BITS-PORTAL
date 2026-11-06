import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ImageOff, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  createService,
  getServiceCategories,
  updateService,
} from "../services/serviceService";

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const formValues = (service) => ({
  category_id: service?.category_id?.toString() || "",
  title: service?.title || "",
  url: service?.url || "",
  description: service?.description || "",
  image: service?.image || "",
});

function ServiceModal({ service, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: formValues(service),
  });
  const image = useWatch({ control, name: "image" });
  const categoryId = useWatch({ control, name: "category_id" });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failedImage, setFailedImage] = useState("");
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    reset(formValues(service));
  }, [service, reset]);

  useEffect(() => {
    let active = true;
    getServiceCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch((error) => {
        if (active) {
          setCategoryError(
            error.response?.data?.message ||
              "Unable to load service categories.",
          );
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
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

  const submitService = async (form) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const payload = {
      category_id: Number(form.category_id),
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      image: form.image.trim() || null,
    };
    try {
      if (service) {
        await updateService(service.id, payload);
      } else {
        await createService(payload);
      }
      toast.success(
        service
          ? "Service updated successfully."
          : "Service created successfully.",
      );
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save service.");
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
        aria-labelledby="service-modal-title"
        aria-describedby="service-modal-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="service-modal-title"
              className="text-xl font-semibold text-slate-800"
            >
              {service ? "Edit Service" : "Register a New Service"}
            </h2>
            <p
              id="service-modal-description"
              className="mt-1 text-sm text-slate-500"
            >
              {service
                ? "Update the details of this existing service."
                : "Add a new service to the BITS Portal and make it accessible to users."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => handleSubmit(submitService)(event)}
          noValidate
          className="mt-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Category
                <select
                  {...register("category_id", {
                    required: "Select a service category.",
                    validate: (value) =>
                      categories.some(
                        (category) => String(category.id) === value,
                      ) || "Select an available service category.",
                  })}
                  value={categoryId}
                  required
                  aria-invalid={!!errors.category_id}
                  aria-describedby={
                    errors.category_id ? "category-error" : undefined
                  }
                  disabled={categoriesLoading || !!categoryError || submitting}
                  className={fieldClass}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>
                  {categoriesLoading && service?.category_id && (
                    <option value={service.category_id}>
                      Loading current category...
                    </option>
                  )}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {errors.category_id && (
                <p
                  id="category-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {errors.category_id.message}
                </p>
              )}
              {categoryError && (
                <p role="alert" className="text-sm text-red-700">
                  {categoryError}
                </p>
              )}
              {!categoriesLoading &&
                !categoryError &&
                categories.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No service categories are available.
                  </p>
                )}
              <label className="block text-sm font-medium text-slate-700">
                Service Name
                <input
                  {...register("title", {
                    validate: (value) =>
                      !!value.trim() || "Service name is required.",
                    maxLength: {
                      value: 255,
                      message: "Service name must be at most 255 characters.",
                    },
                  })}
                  required
                  maxLength={255}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>
              {errors.title && (
                <p
                  id="title-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {errors.title.message}
                </p>
              )}
              <label className="block text-sm font-medium text-slate-700">
                Service URL
                <input
                  {...register("url", {
                    validate: (value) => {
                      if (!value.trim()) return "Service URL is required.";
                      try {
                        new URL(value.trim());
                        return true;
                      } catch {
                        return "Enter a valid service URL.";
                      }
                    },
                  })}
                  type="url"
                  required
                  aria-invalid={!!errors.url}
                  aria-describedby={errors.url ? "url-error" : undefined}
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>
              {errors.url && (
                <p id="url-error" role="alert" className="text-sm text-red-700">
                  {errors.url.message}
                </p>
              )}
              <label className="block text-sm font-medium text-slate-700">
                Summary
                <textarea
                  {...register("description", {
                    validate: (value) =>
                      !!value.trim() || "Summary is required.",
                  })}
                  rows={3}
                  required
                  aria-invalid={!!errors.description}
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>
              {errors.description && (
                <p
                  id="description-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {errors.description.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Service Logo
                <input
                  {...register("image", {
                    onChange: () => setFailedImage(""),
                  })}
                  placeholder="Image URL"
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Enter an image URL. File uploads are not supported by the
                current backend.
              </p>
              <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
                {image.trim() && image !== failedImage ? (
                  <img
                    src={image}
                    alt="Service logo preview"
                    onError={() => setFailedImage(image)}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-sm text-slate-500">
                    <ImageOff
                      size={24}
                      aria-hidden="true"
                      className="mx-auto mb-2"
                    />
                    {image && image === failedImage
                      ? "Unable to load image preview."
                      : "No logo selected."}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
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
              disabled={
                submitting ||
                categoriesLoading ||
                !!categoryError ||
                categories.length === 0
              }
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : service
                  ? "Save Changes"
                  : "Deploy Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServiceModal;
