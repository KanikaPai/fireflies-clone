"use client";

import { useEffect } from "react";

import { useSettings } from "@/hooks/useSettings";
import { applyTheme } from "@/lib/theme";

/** Keeps the `dark` class on <html> in step with the saved theme setting, and follows the OS when it is "system". */
export function ThemeSync() {
  const theme = useSettings().data?.theme;

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
