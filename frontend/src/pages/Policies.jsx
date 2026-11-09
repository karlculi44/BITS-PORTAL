import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";
import PolicyModal from "../components/PolicyModal";
import SearchFilter from "../components/SearchFilter";
import ViewToggle from "../components/ViewToggle";
import { tooltip } from "../components/tooltip";
import { hasSectionAccess } from "../components/navItems";
import { useAuth } from "../hooks/useAuth";
import { getCategories } from "../services/categoryService";
import { deletePolicy, getPolicyDocument, getPolicies } from "../services/policyService";

function PolicyActions({
  policy,
  canManagePolicies,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={() => onView(policy)}
        aria-label={`View ${policy.title}`}
        {...tooltip("View Policy")}
        className="rounded-md p-2 text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
      >
        <Eye size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onEdit(policy)}
        disabled={!canManagePolicies}
        aria-label={`Edit ${policy.title}`}
        {...(canManagePolicies
          ? tooltip("Edit Policy")
          : tooltip("You do not have permission to manage policies"))}
        className="rounded-md p-2 text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pencil size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(policy)}
        disabled={!canManagePolicies}
        aria-label={`Delete ${policy.title}`}
        {...(canManagePolicies
          ? tooltip("Delete Policy")
          : tooltip("You do not have permission to manage policies"))}
        className="rounded-md p-2 text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function Policies() {
  const { user } = useAuth();
  const canManagePolicies = hasSectionAccess(user, "policies");
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyToDelete, setPolicyToDelete] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPolicies(), getCategories("policy")])
      .then(([policyResult, categoryResult]) => {
        if (!active) return;
        setPolicies(policyResult);
        setCategories(
          categoryResult.filter((category) => category.type === "policy"),
        );
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
            "Unable to load policies and categories.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refresh]);

  const categoryNames = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [String(category.id), category.name]),
      ),
    [categories],
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtersActive = !!normalizedSearch || !!categoryFilter;
  const filteredPolicies = policies.filter((policy) => {
    const categoryName =
      policy.category_name || categoryNames[String(policy.category_id)] || "";
    return (
      (!categoryFilter || String(policy.category_id) === categoryFilter) &&
      (!normalizedSearch ||
        [policy.title, policy.description, categoryName].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        ))
    );
  });
  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  const reload = () => {
    setLoading(true);
    setError("");
    setRefresh((current) => current + 1);
  };

  const viewPolicy = async (policy) => {
    const documentTab = window.open("about:blank", "_blank");
    if (!documentTab) {
      toast.error("Allow pop-ups to view policy documents.");
      return;
    }
    documentTab.opener = null;

    try {
      const documentBlob = await getPolicyDocument(policy.id);
      const documentUrl = URL.createObjectURL(documentBlob);
      documentTab.location.replace(documentUrl);
      window.setTimeout(() => URL.revokeObjectURL(documentUrl), 60_000);
    } catch (requestError) {
      documentTab.close();
      toast.error(
        requestError.response?.data?.message ||
          "Unable to open the policy document.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Policies Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage and organize portal regulatory documents.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchFilter
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search policies..."
            searchLabel="Search policies"
            searchTooltip="Search policies by title, description, or category"
            filterValue={categoryFilter}
            onFilterChange={setCategoryFilter}
            filterOptions={categoryOptions}
            filterLabel="Filter by policy category"
            filterTooltip="Filter policies by category"
            filterPlaceholder="All Categories"
            disabled={loading}
          />
          <ViewToggle
            label="Policies view"
            viewMode={viewMode}
            onChange={setViewMode}
          />
          <button
            type="button"
            onClick={() => setSelectedPolicy({})}
            disabled={!canManagePolicies}
            {...(!canManagePolicies &&
              tooltip("You do not have permission to manage policies"))}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Plus size={18} aria-hidden="true" />
            Add Policy
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
        {loading ? (
          <p role="status" className="p-5 text-sm text-slate-500">
            Loading policies...
          </p>
        ) : error ? (
          <div className="p-5 text-sm">
            <p role="alert" className="text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-2 font-medium text-blue-700 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : policies.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            <p>No policies available.</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            <p>
              {normalizedSearch && categoryFilter
                ? "No policies match your search in the selected category."
                : normalizedSearch
                  ? "No policies match your search."
                  : "No policies found in the selected category."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                }}
                className="mt-2 font-medium text-blue-700 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <table className="w-full min-w-160 table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="w-1/4 px-5 py-3">
                  Category
                </th>
                <th scope="col" className="px-5 py-3">
                  Policy Information
                </th>
                <th scope="col" className="w-32 px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPolicies.map((policy) => (
                <tr
                  key={policy.id}
                  className="transition-colors hover:bg-slate-100"
                >
                  <td className="wrap-break-word px-5 py-4 align-top text-slate-600">
                    {policy.category_name ||
                      categoryNames[String(policy.category_id)] ||
                      "Uncategorized"}
                  </td>
                  <td className="wrap-break-word px-5 py-4 align-top">
                    <p className="font-semibold text-slate-800">
                      {policy.title}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
                      {policy.description?.trim() ||
                        "No description available."}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <PolicyActions
                      policy={policy}
                      canManagePolicies={canManagePolicies}
                      onView={viewPolicy}
                      onEdit={setSelectedPolicy}
                      onDelete={setPolicyToDelete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredPolicies.map((policy) => (
              <li
                key={policy.id}
                className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="wrap-break-word font-semibold text-slate-800">
                  {policy.title}
                </h3>
                <span className="mt-1 self-start wrap-break-word rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {policy.category_name ||
                    categoryNames[String(policy.category_id)] ||
                    "Uncategorized"}
                </span>
                <p className="mt-3 flex-1 whitespace-pre-line wrap-break-word text-sm text-slate-500">
                  {policy.description?.trim() || "No description available."}
                </p>
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <PolicyActions
                    policy={policy}
                    canManagePolicies={canManagePolicies}
                    onView={viewPolicy}
                    onEdit={setSelectedPolicy}
                    onDelete={setPolicyToDelete}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedPolicy && (
        <PolicyModal
          key={selectedPolicy.id || "new"}
          policy={selectedPolicy.id ? selectedPolicy : null}
          categories={categories}
          onClose={() => setSelectedPolicy(null)}
          onSaved={() => {
            setSelectedPolicy(null);
            reload();
          }}
        />
      )}
      {policyToDelete && (
        <ConfirmationModal
          title="Delete Policy"
          message={`Delete policy "${policyToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Policy"
          pendingLabel="Deleting..."
          errorMessage="Unable to delete policy."
          onConfirm={() => deletePolicy(policyToDelete.id)}
          onClose={() => setPolicyToDelete(null)}
          onSuccess={() => {
            toast.success("Policy deleted successfully.");
            setPolicyToDelete(null);
            setPolicies((current) =>
              current.filter((policy) => policy.id !== policyToDelete.id),
            );
          }}
        />
      )}
    </div>
  );
}

export default Policies;
