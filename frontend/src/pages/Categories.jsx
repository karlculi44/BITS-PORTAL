import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import CategoryModal from "../components/CategoryModal";
import ConfirmationModal from "../components/ConfirmationModal";
import SearchFilter from "../components/SearchFilter";
import { tooltip } from "../components/tooltip";
import { hasSectionAccess } from "../components/navItems";
import { useAuth } from "../hooks/useAuth";
import {
  deleteCategory,
  getCategories,
  setDefaultCategory,
} from "../services/categoryService";

const ADMIN_ONLY_MESSAGE = "Only admins can manage categories";

const TABS = [
  { value: "service", label: "Service Categories", noun: "service" },
  { value: "policy", label: "Policy Categories", noun: "policy" },
];

function Categories() {
  const { user } = useAuth();
  const isAdmin = hasSectionAccess(user, "categories");
  const [activeTab, setActiveTab] = useState("service");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [defaultUpdatingId, setDefaultUpdatingId] = useState(null);

  useEffect(() => {
    let active = true;
    getCategories(activeTab)
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || "Unable to load categories.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, refresh]);

  const reload = () => {
    setLoading(true);
    setError("");
    setRefresh((current) => current + 1);
  };

  const changeTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCategories([]);
    setSearchTerm("");
    setDefaultUpdatingId(null);
    setLoading(true);
    setError("");
  };

  const handleDefaultChange = async (category, isDefault) => {
    setDefaultUpdatingId(category.id);
    try {
      await setDefaultCategory(category.id, isDefault);
      setCategories((current) =>
        current.map((item) => ({
          ...item,
          is_default: item.id === category.id ? isDefault : false,
        })),
      );
      toast.success(
        isDefault
          ? `${category.name} is now the default service category.`
          : `${category.name} is no longer the default service category.`,
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Unable to update default category.",
      );
    } finally {
      setDefaultUpdatingId(null);
    }
  };

  const handleAllCategoriesDefault = async () => {
    const current = categories.find((category) => category.is_default);
    if (!current) return;
    setDefaultUpdatingId("all");
    try {
      // No default service category means the portal shows every service.
      await setDefaultCategory(current.id, false);
      setCategories((items) =>
        items.map((item) => ({ ...item, is_default: false })),
      );
      toast.success("All Categories is now the default service category.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Unable to update default category.",
      );
    } finally {
      setDefaultUpdatingId(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCategories = categories.filter(
    (category) =>
      category.type === activeTab &&
      (!normalizedSearch ||
        category.name.toLowerCase().includes(normalizedSearch)),
  );
  const noun = TABS.find((tab) => tab.value === activeTab).noun;
  const isServiceTab = activeTab === "service";
  const showAllCategories =
    isServiceTab &&
    (!normalizedSearch || "all categories".includes(normalizedSearch));
  const allCategoriesDefault = !categories.some(
    (category) => category.is_default,
  );
  const serviceCount = categories.reduce(
    (total, category) =>
      category.type === "service" ? total + category.item_count : total,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Categories</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage the service and policy categories used in the BITS Portal.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Category types"
        className="flex gap-1 border-b border-slate-200"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => changeTab(value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-700 ${
              activeTab === value
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchFilter
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search categories"
          searchLabel="Search categories"
          searchTooltip="Search categories by name"
        />
        <span
          className="self-start"
          {...(!isAdmin && tooltip(ADMIN_ONLY_MESSAGE))}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              setModalOpen(true);
            }}
            disabled={!isAdmin}
            {...(isAdmin && tooltip("Add a new category"))}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} aria-hidden="true" />
            Add Category
          </button>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p role="status" className="p-5 text-sm text-slate-500">
            Loading categories...
          </p>
        ) : error ? (
          <p role="alert" className="p-5 text-sm text-red-700">
            {error}
          </p>
        ) : categories.length === 0 && !isServiceTab ? (
          <p className="p-5 text-sm text-slate-500">
            No {noun} categories available.
          </p>
        ) : filteredCategories.length === 0 && !showAllCategories ? (
          <p className="p-5 text-sm text-slate-500">
            No {noun} categories match your search.
          </p>
        ) : (
          <table className="w-full min-w-160 table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Name
                </th>
                <th scope="col" className="w-24 px-5 py-3">
                  Items
                </th>
                {isServiceTab && (
                  <th scope="col" className="w-32 px-5 py-3">
                    Default
                  </th>
                )}
                <th scope="col" className="w-32 px-5 py-3">
                  Status
                </th>
                <th scope="col" className="w-36 px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showAllCategories && (
                <tr className="bg-slate-50/60">
                  <td className="px-5 py-4 font-medium text-slate-800">
                    All Categories
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      System
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-extrabold">
                    {serviceCount}
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={allCategoriesDefault}
                      onChange={handleAllCategoriesDefault}
                      disabled={
                        !isAdmin ||
                        allCategoriesDefault ||
                        defaultUpdatingId !== null
                      }
                      aria-label="Set All Categories as default service category"
                      {...tooltip(
                        allCategoriesDefault
                          ? "Selected while no category is the default"
                          : "Default service category",
                      )}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="px-5 py-4 text-slate-600">Active</td>
                  <td className="px-5 py-4 text-slate-400">—</td>
                </tr>
              )}
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td className="wrap-break-word px-5 py-4 font-medium text-slate-800 ">
                    {category.name}
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-extrabold">
                    {category.item_count}
                  </td>
                  {isServiceTab && (
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={category.is_default}
                        onChange={(event) =>
                          handleDefaultChange(category, event.target.checked)
                        }
                        disabled={!isAdmin || defaultUpdatingId !== null}
                        aria-label={`Set ${category.name} as default service category`}
                        {...tooltip("Default service category")}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                  )}
                  <td className="px-5 py-4 text-slate-600">
                    {category.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setModalOpen(true);
                        }}
                        disabled={!isAdmin}
                        aria-label={`Edit ${category.name}`}
                        {...tooltip("Edit Category")}
                        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(category)}
                        disabled={!isAdmin}
                        aria-label={`Delete ${category.name}`}
                        {...tooltip("Delete Category")}
                        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modalOpen && (
        <CategoryModal
          category={selectedCategory}
          type={activeTab}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            reload();
          }}
        />
      )}
      {categoryToDelete && (
        <ConfirmationModal
          title="Delete Category"
          message={`Delete category "${categoryToDelete.name}"?`}
          confirmLabel="Delete Category"
          pendingLabel="Deleting..."
          errorMessage="Unable to delete category."
          onConfirm={() => deleteCategory(categoryToDelete.id)}
          onClose={() => setCategoryToDelete(null)}
          onSuccess={() => {
            toast.success("Category deleted successfully.");
            setCategoryToDelete(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

export default Categories;
