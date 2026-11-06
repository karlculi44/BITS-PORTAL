import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FolderTree,
  History,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Server,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/services", label: "Services", icon: Server },
  { to: "/policies", label: "Policies", icon: ScrollText },
  { to: "/categories", label: "Categories", icon: FolderTree },
  { to: "/activity-logs", label: "Activity Logs", icon: History },
];

function Sidebar({ open, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast.error("Unable to log out. Please try again.");
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-5 text-xl font-bold text-blue-700">BITS Portal</div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
