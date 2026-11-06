import {
  FolderTree,
  History,
  LayoutDashboard,
  ScrollText,
  Server,
  Users,
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/services", label: "Services", icon: Server },
  { to: "/policies", label: "Policies", icon: ScrollText },
  { to: "/categories", label: "Categories", icon: FolderTree },
  { to: "/activity-logs", label: "Activity Logs", icon: History },
];
