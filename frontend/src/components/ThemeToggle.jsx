import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/themeContext";
import { tooltip } from "./tooltip";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
      {...tooltip(`Switch to ${isDark ? "light" : "dark"} mode`, "bottom")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export default ThemeToggle;
