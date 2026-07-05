"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { ThemeMode } from "@/lib/types";
import { getLocalStorage } from "@/lib/utils";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  // Defer client-only logic to useEffect to prevent hydration mismatch.
  // The Provider wrapper is always present so server and client HTML match.
  useEffect(() => {
    const saved = getLocalStorage<ThemeMode>("wt_theme", "light");
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("wt_theme", JSON.stringify(next));
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
