import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AppTooltip from "../components/AppTooltip";
import { adminChristmasOrnaments, ChristmasOrnaments } from "../features/seasonal";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="app-shell min-h-screen bg-slate-100 text-slate-800">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content relative z-10 lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <ChristmasOrnaments {...adminChristmasOrnaments} />
        <main
          key={pathname}
          className="page-content mx-auto min-h-[calc(100vh-4rem)] max-w-screen-2xl p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>
      <AppTooltip />
    </div>
  );
}

export default AdminLayout;
