import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getServiceImageUrl } from "../services/serviceService";
import { navItems } from "./navItems";
import { tooltip } from "./tooltip";
import ThemeToggle from "./ThemeToggle";

function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const [failedImage, setFailedImage] = useState("");
  const { pathname } = useLocation();
  const title = navItems.find((item) => item.to === pathname)?.label ?? "Admin";
  const image = user?.profile_image ? getServiceImageUrl(user.profile_image) : "";

  return (
    <header className="topbar sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="primary-navigation"
          {...tooltip("Open navigation", "bottom")}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700 lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
          {title}
        </h1>
      </div>
      {user && (
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">
              {[user.first_name, user.last_name].filter(Boolean).join(" ")}
            </p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            {image && image !== failedImage ? (
              <img
                src={image}
                alt=""
                onError={() => setFailedImage(image)}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <User size={18} aria-hidden="true" />
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Topbar;
