import { Outlet } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";
import PublicHeader from "../components/PublicHeader";
import PublicOutletTransition from "../components/PublicOutletTransition";

function PublicLayout() {
  return (
    <div className="public-site-layout">
      <PublicHeader />
      <div className="public-site-content">
        <PublicOutletTransition>
          <Outlet />
        </PublicOutletTransition>
      </div>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
