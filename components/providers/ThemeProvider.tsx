"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "dark" | "light" | "system";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: "dark" | "light";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const storageKey = "tahminx-theme-mode";

const getSystemMode = (): "dark" | "light" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getInitialMode = (): ThemeMode => {
  return "system";
};

const getInitialSystemMode = (): "dark" | "light" => {
  return "dark";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemMode, setSystemMode] = useState<"dark" | "light">(getInitialSystemMode);
  const resolvedMode = mode === "system" ? systemMode : mode;

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) as ThemeMode | null;
    if (stored === "dark" || stored === "light" || stored === "system") {
      setModeState(stored);
    }
    setSystemMode(getSystemMode());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedMode);
    window.localStorage.setItem(storageKey, mode);
  }, [mode, resolvedMode]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemMode(media.matches ? "dark" : "light");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode: setModeState
    }),
    [mode, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

