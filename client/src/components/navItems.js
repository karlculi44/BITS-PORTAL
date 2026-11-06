import {
  FolderTree,
  History,
  LayoutDashboard,
  ScrollText,
  Server,
  Users,
} from "lucide-react";

// `section` items follow the can_access_* permissions, `adminOnly` items
// require the admin role, and the rest are visible to every signed-in user.
export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/services", label: "Services", icon: Server, section: "services" },
  { to: "/policies", label: "Policies", icon: ScrollText, section: "policies" },
  {
    to: "/categories",
    label: "Categories",
    icon: FolderTree,
    section: "categories",
  },
  { to: "/activity-logs", label: "Activity Logs", icon: History, adminOnly: true },
];

export const hasSectionAccess = (user, section) =>
  user?.role === "admin" || user?.[`can_access_${section}`] === true;

export const canViewNavItem = (user, item) => {
  if (item.adminOnly) return user?.role === "admin";
  if (item.section) return hasSectionAccess(user, item.section);
  return true;
};
