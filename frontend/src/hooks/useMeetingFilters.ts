"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { activeFilterCount, parseFilters, toApiParams } from "@/lib/meetingFilters";

type Updates = Record<string, string | string[] | null>;

/** Reads library filters from the URL and exposes setters that write back to it (router.replace). */
export function useMeetingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const apiParams = useMemo(() => toApiParams(filters), [filters]);

  const update = useCallback(
    (updates: Updates) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        next.delete(key);
        if (Array.isArray(value)) value.forEach((item) => next.append(key, item));
        else if (value !== null && value !== "") next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clear = useCallback(
    () => update({ q: null, participant: null, tag_id: null, range: null, from: null, to: null, duration: null }),
    [update],
  );

  return { filters, apiParams, update, clear, activeCount: activeFilterCount(filters) };
}
