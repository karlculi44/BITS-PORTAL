import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  const transitionRef = useRef(false);
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

  useLayoutEffect(() => {
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

  const toggleTheme = () => {
    if (transitionRef.current) return;

    const nextTheme = theme === "dark" ? "light" : "dark";
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      reducedMotion ||
      typeof document.startViewTransition !== "function" ||
      typeof window.CSS?.registerProperty !== "function" ||
      !window.CSS.supports("mask-image", "linear-gradient(135deg, black, transparent)")
    ) {
      setTheme(nextTheme);
      return;
    }

    const root = document.documentElement;
    transitionRef.current = true;
    root.dataset.themeTransition = "true";

    try {
      const transition = document.startViewTransition(() => {
        root.dataset.themeTransitionCapture = "true";
        flushSync(() => setTheme(nextTheme));
      });

      // Re-enable ordinary UI transitions after the new snapshot is captured.
      transition.ready.then(
        () => delete root.dataset.themeTransitionCapture,
        () => delete root.dataset.themeTransitionCapture,
      );
      transition.finished.then(
        () => {
          delete root.dataset.themeTransition;
          transitionRef.current = false;
        },
        (error) => {
          delete root.dataset.themeTransitionCapture;
          delete root.dataset.themeTransition;
          transitionRef.current = false;
          console.error("Unable to complete the theme transition:", error);
        },
      );
    } catch (error) {
      delete root.dataset.themeTransitionCapture;
      delete root.dataset.themeTransition;
      transitionRef.current = false;
      console.error("Unable to start the theme transition:", error);
      setTheme(nextTheme);
    }
  };
  const value = { theme, setTheme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
