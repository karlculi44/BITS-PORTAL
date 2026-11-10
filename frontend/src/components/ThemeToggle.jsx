import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/themeContext";
import { tooltip } from "./tooltip";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      onClick={toggleTheme}
      {...tooltip(label, "bottom")}
      className="theme-switch"
    >
      <Sun className="theme-switch-icon theme-switch-sun" size={14} aria-hidden="true" />
      <Moon className="theme-switch-icon theme-switch-moon" size={14} aria-hidden="true" />
      <span className="theme-switch-thumb" aria-hidden="true" />
    </button>
  );
}

export default ThemeToggle;
