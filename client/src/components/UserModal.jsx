import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FolderTree, ScrollText, Server, X } from "lucide-react";
import toast from "react-hot-toast";
import { tooltip } from "./tooltip";
import { createUser, updateUser } from "../services/userService";
import { getServiceImageUrl } from "../services/serviceService";

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const SECTIONS = [
  { name: "canAccessServices", label: "Services", icon: Server },
  { name: "canAccessPolicies", label: "Policies", icon: ScrollText },
  { name: "canAccessCategories", label: "Categories", icon: FolderTree },
];

const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const formValues = (user) => ({
  fullName: user ? `${user.first_name} ${user.last_name}`.trim() : "",
  username: user?.username || "",
  password: "",
  role: user?.role || "staff",
  canAccessServices: user?.can_access_services === true,
  canAccessPolicies: user?.can_access_policies === true,
  canAccessCategories: user?.can_access_categories === true,
});

// The users table stores first and last names separately, so the last word
// becomes the last name and everything before it the first name.
const splitFullName = (fullName) => {
  const words = fullName.trim().split(/\s+/);
  return {
    firstName: words.slice(0, -1).join(" "),
    lastName: words[words.length - 1],
  };
};

const initialOf = (user, fullName, username) =>
  (fullName.trim() || user?.first_name || username || "?")
    .charAt(0)
    .toUpperCase();

function UserModal({ user, isSelf = false, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({ defaultValues: formValues(user) });
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [failedImage, setFailedImage] = useState("");
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const imageInputRef = useRef(null);

  const [role, fullName, username, ...permissionValues] = useWatch({
    control,
    name: ["role", "fullName", "username", ...SECTIONS.map(({ name }) => name)],
  });
  const isAdminRole = role === "admin";
  const existingImage = user?.profile_image
    ? getServiceImageUrl(user.profile_image)
    : "";
  const avatarSource = previewUrl || existingImage;

  useEffect(() => {
    reset(formValues(user));
  }, [user, reset]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && !submittingRef.current) {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
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

  const selectImage = (file) => {
    if (!file) return;

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setError("image", {
        type: "validate",
        message: "Choose a JPEG, PNG, or WebP image.",
      });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("image", {
        type: "validate",
        message: "Profile pictures must be 2 MB or smaller.",
      });
      return;
    }

    clearErrors("image");
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFailedImage("");
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl("");
    clearErrors("image");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const submitUser = async (form) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const { firstName, lastName } = splitFullName(form.fullName);
    const permissions = Object.fromEntries(
      SECTIONS.map(({ name }) => [
        name,
        form.role === "admin" ? true : !!form[name],
      ]),
    );
    const payload = new FormData();
    const append = (key, value) => payload.append(key, String(value));

    try {
      if (user) {
        // The update endpoint accepts partial bodies, so only send changes.
        const original = formValues(user);
        const nameChanged = form.fullName.trim() !== original.fullName;
        const roleChanged = form.role !== user.role;
        const permissionsChanged = SECTIONS.some(
          ({ name }) => permissions[name] !== original[name],
        );

        if (nameChanged) {
          append("firstName", firstName);
          append("lastName", lastName);
        }
        if (form.username.trim() !== user.username)
          append("username", form.username.trim());
        if (roleChanged) append("role", form.role);
        if (roleChanged || permissionsChanged) {
          SECTIONS.forEach(({ name }) => append(name, permissions[name]));
        }
        if (form.password) append("password", form.password);
        if (selectedImage) payload.append("image", selectedImage);

        if (![...payload.keys()].length) {
          onClose();
          return;
        }
        await updateUser(user.id, payload);
      } else {
        append("firstName", firstName);
        append("lastName", lastName);
        append("username", form.username.trim());
        append("password", form.password);
        append("role", form.role);
        SECTIONS.forEach(({ name }) => append(name, permissions[name]));
        if (selectedImage) payload.append("image", selectedImage);
        await createUser(payload);
      }
      toast.success(
        user ? "User updated successfully." : "User created successfully.",
      );
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save user.");
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
        aria-labelledby="user-modal-title"
        aria-describedby="user-modal-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="user-modal-title"
              className="text-xl font-semibold text-slate-800"
            >
              {user ? "Edit User" : "Register User"}
            </h2>
            <p
              id="user-modal-description"
              className="mt-1 text-sm text-slate-500"
            >
              {user
                ? "Update account details, role, and section permissions."
                : "Configure login credentials, profile details, and section permissions."}
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
          onSubmit={(event) => handleSubmit(submitUser)(event)}
          noValidate
          className="mt-6 space-y-4"
        >
          <div className="flex items-center gap-4">
            {avatarSource && avatarSource !== failedImage ? (
              <img
                src={avatarSource}
                alt="Profile picture preview"
                onError={() => setFailedImage(avatarSource)}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-xl font-semibold text-white"
              >
                {initialOf(user, fullName, username)}
              </span>
            )}
            <div className="min-w-0">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Profile Picture"
                disabled={submitting}
                onChange={(event) => selectImage(event.target.files?.[0])}
                className="sr-only"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={submitting}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {avatarSource ? "Change picture" : "Upload picture"}
                </button>
                {selectedImage && (
                  <button
                    type="button"
                    onClick={removeSelectedImage}
                    disabled={submitting}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                JPEG, PNG, or WebP. Maximum size: 2 MB.
              </p>
            </div>
          </div>
          {errors.image && (
            <p role="alert" className="text-sm text-red-700">
              {errors.image.message}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input
                {...register("username", {
                  validate: (value) =>
                    value.trim().length >= 3 ||
                    "Username must be at least 3 characters.",
                })}
                autoComplete="off"
                aria-invalid={!!errors.username}
                disabled={submitting}
                className={fieldClass}
              />
            </label>
            {errors.username && (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input
                {...register("fullName", {
                  validate: (value) =>
                    value.trim().split(/\s+/).length >= 2 ||
                    "Enter both first and last name.",
                })}
                autoComplete="off"
                aria-invalid={!!errors.fullName}
                disabled={submitting}
                className={fieldClass}
              />
            </label>
            {errors.fullName && (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Access Level
            <select
              {...register("role")}
              disabled={submitting || isSelf}
              {...(isSelf && tooltip("You cannot change your own role"))}
              className={fieldClass}
            >
              <option value="staff">
                Staff (limited by permissions below)
              </option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Section Permissions
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {SECTIONS.map(({ name, label, icon: Icon }, index) => (
                <label
                  key={name}
                  className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 has-disabled:opacity-60"
                >
                  <input
                    type="checkbox"
                    checked={isAdminRole || !!permissionValues[index]}
                    onChange={(event) => setValue(name, event.target.checked)}
                    disabled={submitting || isAdminRole}
                    className="h-4 w-4 accent-blue-700"
                  />
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
            {isAdminRole && (
              <p className="mt-2 text-xs text-slate-500">
                Administrators always have full access — these checkboxes only
                apply to Staff users.
              </p>
            )}
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Account Password
              <input
                type="password"
                {...register("password", {
                  validate: (value) =>
                    (user && !value) ||
                    value.length >= 8 ||
                    "Password must be at least 8 characters.",
                })}
                autoComplete="new-password"
                placeholder={user ? "Leave blank to keep current" : ""}
                aria-invalid={!!errors.password}
                disabled={submitting}
                className={fieldClass}
              />
            </label>
            {errors.password && (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.password.message}
              </p>
            )}
          </div>

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
              className="rounded-md bg-linear-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : user
                  ? "Save Changes"
                  : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
