import { Outlet } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";
import PublicHeader from "../components/PublicHeader";
import PublicOutletTransition from "../components/PublicOutletTransition";
import { publicNavbarChristmasLights, publicNavbarLightsStripHeight } from "../features/seasonal";

function PublicLayout() {
  return (
    <div
      className="public-site-layout"
      style={{ "--christmas-strip-height": publicNavbarChristmasLights.enabled ? publicNavbarLightsStripHeight : "0px" }}
    >
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
