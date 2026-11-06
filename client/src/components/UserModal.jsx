import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { tooltip } from "./tooltip";
import { createUser, updateUser } from "../services/userService";

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const formValues = (user) => ({
  firstName: user?.first_name || "",
  lastName: user?.last_name || "",
  username: user?.username || "",
  password: "",
  role: user?.role || "staff",
});

function UserModal({ user, isSelf = false, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: formValues(user) });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    reset(formValues(user));
  }, [user, reset]);

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

  const submitUser = async (form) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const values = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      role: form.role,
    };

    try {
      if (user) {
        // The update endpoint accepts partial bodies, so only send changes.
        const changes = {};
        if (values.firstName !== user.first_name)
          changes.firstName = values.firstName;
        if (values.lastName !== user.last_name)
          changes.lastName = values.lastName;
        if (values.username !== user.username)
          changes.username = values.username;
        if (values.role !== user.role) changes.role = values.role;
        if (form.password) changes.password = form.password;

        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        await updateUser(user.id, changes);
      } else {
        await createUser({ ...values, password: form.password });
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

  const requiredText = (label) => (value) =>
    !!value.trim() || `${label} is required.`;

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
              {user ? "Edit User" : "Add User"}
            </h2>
            <p
              id="user-modal-description"
              className="mt-1 text-sm text-slate-500"
            >
              {user
                ? "Update the details of this existing user."
                : "Add a new administrative account to the BITS Portal."}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                First Name
                <input
                  {...register("firstName", {
                    validate: requiredText("First name"),
                  })}
                  aria-invalid={!!errors.firstName}
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>
              {errors.firstName && (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Last Name
                <input
                  {...register("lastName", {
                    validate: requiredText("Last name"),
                  })}
                  aria-invalid={!!errors.lastName}
                  disabled={submitting}
                  className={fieldClass}
                />
              </label>
              {errors.lastName && (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input
                {...register("username", {
                  validate: (value) =>
                    value.trim().length >= 8 ||
                    "Username must be at least 8 characters.",
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
              Password
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

          <label className="block text-sm font-medium text-slate-700">
            Role
            <select
              {...register("role")}
              disabled={submitting || isSelf}
              {...(isSelf && tooltip("You cannot change your own role"))}
              className={fieldClass}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>

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
              {submitting ? "Saving..." : user ? "Save Changes" : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
