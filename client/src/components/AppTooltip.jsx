import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { TOOLTIP_ID } from "./tooltip";

function AppTooltip() {
  return (
    <Tooltip
      id={TOOLTIP_ID}
      delayShow={300}
      className="z-[100] max-w-xs rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white shadow-lg"
      style={{ backgroundColor: "#1e293b", zIndex: 100 }}
    />
  );
}

export default AppTooltip;
