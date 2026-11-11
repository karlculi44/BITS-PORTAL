import { Outlet } from "react-router-dom";
import PublicFooter from "../components/PublicFooter";
import PublicHeader from "../components/PublicHeader";
import PublicOutletTransition from "../components/PublicOutletTransition";
import {
  publicNavbarChristmasGarland,
  publicNavbarChristmasLights,
  publicNavbarSeasonalStripHeight,
} from "../features/seasonal";

const christmasDecorationsEnabled =
  publicNavbarChristmasLights.enabled || publicNavbarChristmasGarland.enabled;

function PublicLayout() {
  return (
    <div
      className="public-site-layout"
      style={{
        "--christmas-strip-height": christmasDecorationsEnabled
          ? publicNavbarSeasonalStripHeight
          : "0px",
      }}
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
