import { useEffect, useState } from "react";
import { FolderTree, Info, ScrollText, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import StatCard from "../components/StatCard";
import CategoryDistributionChart from "../components/CategoryDistributionChart";
import {
  getDashboardData,
  getRecentServices,
} from "../services/dashboardService";

const formatDate = (value) => new Date(value).toLocaleString();

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function RecentList({ items, primary, secondary }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No records available.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 py-2 text-sm"
        >
          <span className="truncate font-medium text-slate-700">
            {primary(item)}
          </span>
          <span className="shrink-0 text-xs text-slate-500">
            {secondary(item)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [recentServices, setRecentServices] = useState([]);
  const [recentServicesError, setRecentServicesError] = useState("");
  const [recentServicesLoading, setRecentServicesLoading] = useState(true);
  const [recentServicesRetryCount, setRecentServicesRetryCount] = useState(0);

  const retryDashboard = () => {
    setData(null);
    setError("");
    setLoading(true);
    setRetryCount((count) => count + 1);
  };

  const retryRecentServices = () => {
    setRecentServices([]);
    setRecentServicesError("");
    setRecentServicesLoading(true);
    setRecentServicesRetryCount((count) => count + 1);
  };

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active)
          setError(
            err.response?.data?.message || "Unable to load dashboard data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    let active = true;
    getRecentServices()
      .then((result) => {
        if (active) setRecentServices(result);
      })
      .catch((err) => {
        if (active)
          setRecentServicesError(
            err.response?.data?.message || "Unable to load recent services.",
          );
      })
      .finally(() => {
        if (active) setRecentServicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recentServicesRetryCount]);

  const welcome = (
    <h2 className="text-xl font-semibold text-slate-800">
      Welcome, {user?.first_name}
    </h2>
  );

  const cards = data && [
    { label: "Total Users", value: data.stats.total_users, icon: Users },
    {
      label: "Total Policies",
      value: data.stats.total_policies,
      icon: ScrollText,
    },
    {
      label: "Total Categories",
      value: data.stats.total_categories,
      icon: FolderTree,
    },
  ];

  return (
    <div className="space-y-6">
      {welcome}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryDistributionChart
          title="Services by Category"
          description="Distribution of registered services across categories."
          categories={data?.servicesByCategory ?? []}
          filename="services-by-category"
          loading={loading}
          error={error}
          onRetry={retryDashboard}
        />
        <CategoryDistributionChart
          title="Policies by Category"
          description="Distribution of registered policies across categories."
          categories={data?.policiesByCategory ?? []}
          filename="policies-by-category"
          loading={loading}
          error={error}
          onRetry={retryDashboard}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recently Added Services">
          {recentServicesLoading ? (
            <p className="text-sm text-slate-500">Loading recent services...</p>
          ) : recentServicesError ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-red-600">
                {recentServicesError}
              </p>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={retryRecentServices}
              >
                Retry
              </button>
            </div>
          ) : (
            <RecentList
              items={recentServices}
              primary={(service) => service.title}
              secondary={(service) => formatDate(service.created_at)}
            />
          )}
        </Section>
      </div>

      {data && (
        <Section title="Recent Activity">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Info size={16} />
            Activity logs are not available yet: the backend has no logs API or
            logs table.
          </p>
        </Section>
      )}
    </div>
  );
}

export default Dashboard;
