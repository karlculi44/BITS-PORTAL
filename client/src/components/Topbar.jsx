import { useLocation } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { navItems } from "./navItems";
import { tooltip } from "./tooltip";

function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const title = navItems.find((item) => item.to === pathname)?.label ?? "Admin";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          {...tooltip("Open navigation", "bottom")}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">
              {[user.first_name, user.last_name].filter(Boolean).join(" ")}
            </p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <User size={18} />
          </div>
        </div>
      )}
    </header>
  );
}

export default Topbar;
