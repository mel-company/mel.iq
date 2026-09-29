import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

/**
 * The merchant dashboard renders in dark only. Its surfaces were designed
 * against the dark ground, so the light theme is not offered there — and a
 * saved light preference is ignored for as long as the merchant is inside it,
 * never overwritten, so the marketing pages still open the way they chose.
 */
const DARK_ONLY_ROUTES = ["/dashboard", "/store"];

function isDarkOnlyRoute(pathname: string) {
  return DARK_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

type ThemeContextValue = {
  /** The theme actually on screen, forced routes included. */
  isDark: boolean;
  /** False where the route forces dark: the toggle must not be offered. */
  canToggleTheme: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { pathname } = useLocation();
  const forcedDark = isDarkOnlyRoute(pathname);

  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      return saved === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const isDark = forcedDark || prefersDark;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Only the merchant's own choice is stored. Persisting the forced value
  // would make a trip through the dashboard silently repaint the rest of
  // the site dark.
  useEffect(() => {
    localStorage.setItem("theme", prefersDark ? "dark" : "light");
  }, [prefersDark]);

  const toggleTheme = useCallback(() => {
    if (forcedDark) return;
    setPrefersDark((prev) => !prev);
  }, [forcedDark]);

  const value = useMemo(
    () => ({ isDark, canToggleTheme: !forcedDark, toggleTheme }),
    [isDark, forcedDark, toggleTheme],
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
