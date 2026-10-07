import type { Theme } from "@/lib/api/types";

/** localStorage key used only to avoid a flash of the wrong theme before the settings query has loaded. */
export const THEME_STORAGE_KEY = "ff-theme";

export const THEME_LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

export const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark" || value === "system";

/** Whether a theme preference renders dark, given the OS preference. */
export const resolvesToDark = (theme: Theme, systemPrefersDark: boolean): boolean => theme === "dark" || (theme === "system" && systemPrefersDark);

/** Set the `dark` class on <html> (and remember the choice for the next page load). Client only. */
export function applyTheme(theme: Theme): void {
  const dark = resolvesToDark(theme, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable: the theme still applies for this session */
  }
}

/** Inline script run before first paint: applies the remembered theme (default: system). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||((t===null||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
