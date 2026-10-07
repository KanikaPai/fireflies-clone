import { useCallback, useSyncExternalStore } from "react";

import type { Theme } from "@/lib/api/types";
import { applyTheme } from "@/lib/theme";

import { useSettings, useUpdateSettings } from "./useSettings";

const subscribeToHtmlClass = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

/** Current theme preference (from settings) and whether the page is actually dark right now. */
export function useTheme() {
  const { data } = useSettings();
  const save = useUpdateSettings({ toast: false });
  const isDark = useSyncExternalStore(
    subscribeToHtmlClass,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  /** Apply immediately, then persist through PATCH /api/me/settings. */
  const setTheme = useCallback(
    (theme: Theme) => {
      applyTheme(theme);
      save.mutate({ theme });
    },
    [save],
  );

  return { theme: data?.theme, isDark, setTheme };
}
