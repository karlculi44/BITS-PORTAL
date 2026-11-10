import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { tooltip } from "./tooltip";
import { useModalTransition } from "../hooks/useModalTransition";
import Modal from "./Modal";
import Logo from "./Logo";
import {
  createService,
  DEFAULT_SERVICE_LOGO,
  getServiceLogoUrl,
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
});

function ServiceModal({ service, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: formValues(service),
  });
  const categoryId = useWatch({ control, name: "category_id" });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageSelection, setImageSelection] = useState(null);
  const [draggingImage, setDraggingImage] = useState(false);
  const submittingRef = useRef(false);
  const { isClosing, closeWithTransition } = useModalTransition();
  const imageInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const currentServiceId = service?.id ?? null;
  const selectedImage =
    imageSelection?.serviceId === currentServiceId
      ? imageSelection.file
      : null;
  const imagePreview =
    imageSelection?.serviceId === currentServiceId
      ? imageSelection.previewUrl
      : getServiceLogoUrl(service?.image);

  useEffect(() => {
    reset(formValues(service));
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, [service, reset]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

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

  const close = () => {
    if (!submittingRef.current) closeWithTransition(onClose);
  };

  const submitService = async (form) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const payload = new FormData();
    payload.append("category_id", String(Number(form.category_id)));
    payload.append("title", form.title.trim());
    payload.append("url", form.url.trim());
    payload.append("description", form.description.trim());
    if (selectedImage) payload.append("image", selectedImage);

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
      closeWithTransition(onSaved);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save service.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const selectImage = (file) => {
    if (!file) return;

    const supportedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setError("image", {
        type: "validate",
        message: "Choose a PNG, JPG, JPEG, or WebP image.",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("image", {
        type: "validate",
        message: "Service logos must be 2 MB or smaller.",
      });
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setImageSelection({
      serviceId: currentServiceId,
      file,
      previewUrl,
    });
    clearErrors("image");
  };

  const imageField = register("image");

  return (
    <Modal
      titleId="service-modal-title"
      descriptionId="service-modal-description"
      className="max-w-3xl bg-white"
      isClosing={isClosing}
      onClose={close}
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
            onClick={() => closeWithTransition(onClose)}
            disabled={submitting}
            aria-label="Close modal"
            {...tooltip("Close", "left")}
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
                        const protocol = new URL(value.trim()).protocol;
                        return (
                          ["http:", "https:"].includes(protocol) ||
                          "Enter a valid service URL."
                        );
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
              <div>
                <p className="block text-sm font-medium text-slate-700">
                  Service Logo
                </p>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingImage(true);
                  }}
                  onDragLeave={() => setDraggingImage(false)}
                  {...tooltip("Click or drag and drop an image")}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDraggingImage(false);
                    selectImage(event.dataTransfer.files?.[0]);
                  }}
                  className={`mt-2 flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed p-3 ${
                    draggingImage
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <Logo
                    src={imagePreview}
                    alt="Service logo preview"
                    className="service-logo-preview"
                  />
                  <input
                    {...imageField}
                    onChange={(event) => {
                      imageField.onChange(event);
                      selectImage(event.target.files?.[0]);
                    }}
                    ref={(element) => {
                      imageField.ref(element);
                      imageInputRef.current = element;
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Service Logo"
                    disabled={submitting}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={submitting}
                    className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {selectedImage || (service?.image && service.image !== DEFAULT_SERVICE_LOGO)
                      ? "Choose another image"
                      : "Choose image"}
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    PNG, JPG, JPEG, or WebP. Maximum size: 2 MB. BITS logo is used by default.
                  </p>
                </div>
                {errors.image && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {errors.image.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => closeWithTransition(onClose)}
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
    </Modal>
  );
}

export default ServiceModal;
