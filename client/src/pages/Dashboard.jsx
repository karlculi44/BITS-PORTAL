import { useEffect, useState } from "react";
import {
  FolderTree,
  Info,
  ScrollText,
  Server,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import StatCard from "../components/StatCard";
import { getDashboardData } from "../services/dashboardService";

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
  }, []);

  const welcome = (
    <h2 className="text-xl font-semibold text-slate-800">
      Welcome, {user?.first_name}
    </h2>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {welcome}
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        {welcome}
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      </div>
    );
  }

  const { stats, recentUsers, recentServices } = data;
  const cards = [
    { label: "Total Users", value: stats.total_users, icon: Users },
    { label: "Active Users", value: stats.active_users, icon: UserCheck },
    { label: "Total Services", value: stats.total_services, icon: Server },
    { label: "Total Policies", value: stats.total_policies, icon: ScrollText },
    {
      label: "Total Categories",
      value: stats.total_categories,
      icon: FolderTree,
    },
  ];

  return (
    <div className="space-y-6">
      {welcome}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recently Created Users">
          <RecentList
            items={recentUsers}
            primary={(u) => `${u.first_name} ${u.last_name} (${u.username})`}
            secondary={(u) => formatDate(u.created_at)}
          />
        </Section>
        <Section title="Recently Added Services">
          <RecentList
            items={recentServices}
            primary={(s) => s.title}
            secondary={(s) => formatDate(s.created_at)}
          />
        </Section>
      </div>

      <Section title="Recent Activity">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Info size={16} />
          Activity logs are not available yet: the backend has no logs API or
          logs table.
        </p>
      </Section>
    </div>
  );
}

export default Dashboard;
