import { Outlet } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";

function PublicLayout() {
  return (
    <div className="public-site-layout">
      <div className="public-site-content">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
