import { useEffect, useState } from "react";
import { Pencil, Plus, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import SearchFilter from "../components/SearchFilter";
import UserModal from "../components/UserModal";
import ViewToggle from "../components/ViewToggle";
import { tooltip } from "../components/tooltip";
import { useAuth } from "../hooks/useAuth";
import { getUsers, updateUser } from "../services/userService";
import { getServiceImageUrl } from "../services/serviceService";

const fullName = (user) => `${user.first_name} ${user.last_name}`.trim();

const SECTION_LABELS = [
  { key: "can_access_services", label: "Services" },
  { key: "can_access_policies", label: "Policies" },
  { key: "can_access_categories", label: "Categories" },
];

function UserAvatar({ user }) {
  const [failedImage, setFailedImage] = useState("");
  const image = user.profile_image
    ? getServiceImageUrl(user.profile_image)
    : "";
  const [viewing, setViewing] = useState(false);
  const dimmed = user.is_active ? "" : "opacity-50";

  useEffect(() => {
    if (!viewing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setViewing(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewing]);

  if (image && image !== failedImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewing(true)}
          aria-label={`View ${user.username}'s profile picture`}
          className="shrink-0 cursor-zoom-in rounded-full"
        >
          <img
            src={image}
            alt=""
            onError={() => setFailedImage(image)}
            className={`h-9 w-9 rounded-full object-cover ${dimmed}`}
          />
        </button>
        {viewing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${user.username}'s profile picture`}
            onClick={() => setViewing(false)}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          >
            <img
              src={image}
              alt={`${user.username}'s profile picture`}
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white ${dimmed}`}
    >
      {(user.first_name || user.username).charAt(0).toUpperCase()}
    </span>
  );
}

function UserRole({ user }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
        user.role === "admin"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {user.role}
    </span>
  );
}

function UserPermissions({ user }) {
  if (user.role === "admin") {
    return (
      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        ALL ACCESS
      </span>
    );
  }

  const granted = SECTION_LABELS.filter(({ key }) => user[key] === true);

  if (granted.length === 0) {
    return <span className="text-xs text-slate-400">No access</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {granted.map(({ key, label }) => (
        <span
          key={key}
          className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function UserActions({ user, isSelf, statusUpdatingId, onEdit, onStatusChange }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={() => onEdit(user)}
        aria-label={`Edit ${user.username}`}
        {...tooltip("Edit User")}
        className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <Pencil size={18} aria-hidden="true" />
      </button>
      <span {...(isSelf && tooltip("You cannot deactivate your own account"))}>
        <button
          type="button"
          onClick={() => onStatusChange(user)}
          disabled={isSelf || statusUpdatingId !== null}
          aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.username}`}
          {...(!isSelf &&
            tooltip(user.is_active ? "Deactivate User" : "Activate User"))}
          className={`rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            user.is_active
              ? "text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
              : "text-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
          }`}
        >
          {user.is_active ? (
            <UserX size={18} aria-hidden="true" />
          ) : (
            <UserCheck size={18} aria-hidden="true" />
          )}
        </button>
      </span>
    </div>
  );
}

function Users() {
  const { user: currentUser, updateUser: updateCurrentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  useEffect(() => {
    let active = true;
    getUsers()
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || "Unable to load users.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const reload = () => {
    setLoading(true);
    setError("");
    setRefresh((current) => current + 1);
  };

  const handleStatusChange = async (user) => {
    const activating = !user.is_active;
    const action = activating ? "Activate" : "Deactivate";
    if (!window.confirm(`${action} user "${user.username}"?`)) return;

    setStatusUpdatingId(user.id);
    try {
      const result = await updateUser(user.id, { isActive: activating });
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, ...result.data } : item,
        ),
      );
      toast.success(
        activating
          ? "User activated successfully."
          : "User deactivated successfully.",
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          `Unable to ${action.toLowerCase()} user.`,
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      !normalizedSearch ||
      [user.username, user.first_name, user.last_name, fullName(user)].some(
        (value) => value?.toLowerCase().includes(normalizedSearch),
      ),
  );
  const openEditModal = (user) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            User Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage administrative accounts and permissions.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchFilter
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search users..."
            searchLabel="Search users"
            searchTooltip="Search by username or name"
          />
          <ViewToggle label="Users view" viewMode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setModalOpen(true);
            }}
            {...tooltip("Add a new user")}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-linear-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700"
          >
            <Plus size={18} aria-hidden="true" />
            Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p role="status" className="p-5 text-sm text-slate-500">
            Loading users...
          </p>
        ) : error ? (
          <p role="alert" className="p-5 text-sm text-red-700">
            {error}
          </p>
        ) : users.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No users available.</p>
        ) : filteredUsers.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            No users match your search.
          </p>
        ) : viewMode === "list" ? (
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="w-20 px-5 py-3">
                  Avatar
                </th>
                <th scope="col" className="px-5 py-3">
                  Username
                </th>
                <th scope="col" className="px-5 py-3">
                  Full Name
                </th>
                <th scope="col" className="px-5 py-3">
                  Role
                </th>
                <th scope="col" className="px-5 py-3">
                  Permissions
                </th>
                <th scope="col" className="w-28 px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isSelf = String(user.id) === String(currentUser?.id);
                return (
                  <tr
                    key={user.id}
                    className={user.is_active ? "" : "bg-slate-50/60"}
                  >
                    <td className="px-5 py-3">
                      <UserAvatar user={user} />
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {user.username}
                      {!user.is_active && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {fullName(user)}
                    </td>
                    <td className="px-5 py-3">
                      <UserRole user={user} />
                    </td>
                    <td className="px-5 py-3">
                      <UserPermissions user={user} />
                    </td>
                    <td className="px-5 py-3">
                      <UserActions
                        user={user}
                        isSelf={isSelf}
                        statusUpdatingId={statusUpdatingId}
                        onEdit={openEditModal}
                        onStatusChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <ul className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <li
                key={user.id}
                className={`flex flex-col rounded-lg border border-slate-200 p-4 shadow-sm transition-shadow hover:shadow-md ${
                  user.is_active ? "bg-white" : "bg-slate-50/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <h3 className="wrap-break-word font-semibold text-slate-800">
                      {user.username}
                    </h3>
                    <p className="wrap-break-word text-sm text-slate-600">
                      {fullName(user)}
                    </p>
                    {!user.is_active && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <UserActions
                    user={user}
                    isSelf={String(user.id) === String(currentUser?.id)}
                    statusUpdatingId={statusUpdatingId}
                    onEdit={openEditModal}
                    onStatusChange={handleStatusChange}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <UserRole user={user} />
                  <UserPermissions user={user} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {modalOpen && (
        <UserModal
          user={selectedUser}
          isSelf={
            !!selectedUser && String(selectedUser.id) === String(currentUser?.id)
          }
          onClose={() => setModalOpen(false)}
          onSaved={(updatedUser) => {
            if (
              updatedUser &&
              String(updatedUser.id) === String(currentUser?.id)
            ) {
              updateCurrentUser(updatedUser);
            }
            setModalOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

export default Users;
