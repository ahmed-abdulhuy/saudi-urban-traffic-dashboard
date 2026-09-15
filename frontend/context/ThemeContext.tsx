"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
type Theme = "dark" | "light";
interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}
interface ThemeProviderProps {
  children: ReactNode;
}
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const storedTheme = localStorage.getItem("rtcis-theme");
    return storedTheme === "light" ? "light" : "dark";
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("rtcis-theme", theme);
  }, [theme]);
  const toggle = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {" "}
      {children}{" "}
    </ThemeContext.Provider>
  );
}
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
