import { useEffect, useState } from "react";
import { ClipboardList, LogIn, Pencil, Plus, ShieldAlert } from "lucide-react";
import AuditLogsTable from "../components/AuditLogsTable";
import StatCard from "../components/StatCard";
import { getAuditLogs } from "../services/auditLogService";
import { usePageLoading } from "../hooks/usePageLoading";

const emptyFilters = { module: "", action: "", username: "", date: "" };
const actions = ["Login", "Logout", "Login Failed", "Add", "Edit", "Delete"];
const fieldClass =
  "mt-1.5 w-full min-w-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800";

function AuditLogs() {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  usePageLoading(loading);

  useEffect(() => {
    const controller = new AbortController();
    getAuditLogs(appliedFilters, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.response?.data?.message || "Unable to load audit logs.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appliedFilters, retry]);

  const summary = data?.summary;
  const cards = summary && [
    { label: "Total Entries", value: summary.total, icon: ClipboardList },
    { label: "Login", value: summary.login, icon: LogIn },
    { label: "Edit", value: summary.edit, icon: Pencil },
    { label: "Add", value: summary.add, icon: Plus },
    { label: "Login Failed", value: summary.login_failed, icon: ShieldAlert },
  ];
  const modules = summary?.modules || [];

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    if (Object.keys(emptyFilters).some((key) => filters[key] !== appliedFilters[key])) {
      setLoading(true);
      setAppliedFilters(filters);
    }
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    if (Object.values(appliedFilters).some(Boolean)) {
      setLoading(true);
      setAppliedFilters(emptyFilters);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Audit Logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track all user activity – logins, logouts, and record changes.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {cards?.map((card) => <StatCard key={card.label} {...card} />)}
      </div>
      <form
        onSubmit={applyFilters}
        aria-label="Activity filters"
        className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end"
      >
        <label className="min-w-0 text-sm font-medium text-slate-700">
          Module
          <select name="module" value={filters.module} onChange={updateFilter} className={fieldClass}>
            <option value="">All Modules</option>
            {modules.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium text-slate-700">
          Action
          <select name="action" value={filters.action} onChange={updateFilter} className={fieldClass}>
            <option value="">All Actions</option>
            {actions.map((action) => <option key={action} value={action}>{action}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium text-slate-700">
          Username
          <input name="username" type="text" value={filters.username} onChange={updateFilter} placeholder="Search user..." className={fieldClass} />
        </label>
        <label className="min-w-0 text-sm font-medium text-slate-700">
          Date
          <input name="date" type="date" value={filters.date} onChange={updateFilter} className={fieldClass} />
        </label>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
          <button type="submit" className="min-h-10 flex-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Filter
          </button>
          <button type="button" onClick={clearFilters} className="min-h-10 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Clear
          </button>
        </div>
      </form>
      {loading ? (
        <p role="status" className="text-sm text-slate-500">Loading audit logs...</p>
      ) : error ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => { setLoading(true); setRetry((count) => count + 1); }} className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100">
            Retry
          </button>
        </div>
      ) : (
        <AuditLogsTable
          logs={data.logs}
          emptyMessage={Object.values(appliedFilters).some(Boolean) ? "No audit logs match the selected filters." : "No audit logs available."}
        />
      )}
    </div>
  );
}

export default AuditLogs;
