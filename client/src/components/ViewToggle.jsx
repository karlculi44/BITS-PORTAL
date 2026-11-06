import { LayoutGrid, List } from "lucide-react";
import { tooltip } from "./tooltip";

const VIEW_OPTIONS = [
  { value: "list", label: "List View", icon: List },
  { value: "grid", label: "Grid View", icon: LayoutGrid },
];

function ViewToggle({ label, viewMode, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex self-start rounded-md border border-slate-300 bg-white p-0.5"
    >
      {VIEW_OPTIONS.map(({ value, label: optionLabel, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={optionLabel}
          aria-pressed={viewMode === value}
          {...tooltip(optionLabel)}
          className={`rounded p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
            viewMode === value
              ? "bg-blue-50 text-blue-700"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export default ViewToggle;
