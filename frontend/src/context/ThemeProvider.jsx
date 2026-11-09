import { useCallback, useEffect, useState } from "react";
import { ThemeContext } from "./themeContext";

const STORAGE_KEY = "bits-portal-theme";

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : null;
  } catch (error) {
    console.error("Unable to read the saved theme preference:", error);
    return null;
  }
}

function getSystemTheme() {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () =>
      getStoredTheme() ||
      document.documentElement.dataset.theme ||
      getSystemTheme(),
  );
  const [hasManualPreference, setHasManualPreference] = useState(
    () => !!getStoredTheme(),
  );

  const setTheme = useCallback((nextTheme) => {
    setThemeState(nextTheme);
    setHasManualPreference(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("Unable to save the theme preference:", error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const applySystemTheme = (event) => {
      if (!hasManualPreference) {
        setThemeState(event.matches ? "dark" : "light");
      }
    };
    const syncStoredTheme = (event) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === "light" || event.newValue === "dark") {
        setHasManualPreference(true);
        setThemeState(event.newValue);
      } else {
        setHasManualPreference(false);
        setThemeState(getSystemTheme());
      }
    };

    mediaQuery?.addEventListener("change", applySystemTheme);
    window.addEventListener("storage", syncStoredTheme);
    return () => {
      mediaQuery?.removeEventListener("change", applySystemTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, [hasManualPreference]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const value = { theme, setTheme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
