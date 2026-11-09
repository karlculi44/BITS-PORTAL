import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { House, LogOut, PanelsTopLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { canViewNavItem, navItems } from "./navItems";

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
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
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-slate-900/40 lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside
        id="primary-navigation"
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <PanelsTopLeft size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-slate-800">
              BITS Portal
            </p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              IT Administration
            </p>
          </div>
        </div>
        <nav
          aria-label="Primary navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        >
          {navItems
            .filter((item) => canViewNavItem(user, item))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "active bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="space-y-1 border-t border-slate-200 p-3">
          <Link
            to="/"
            onClick={onClose}
            className="sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <House size={18} aria-hidden="true" />
            Return to Homepage
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <LogOut size={18} aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
