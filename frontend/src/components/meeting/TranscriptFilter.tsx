"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** What the transcript is currently narrowed to (set from Smart Search / speaker menus). */
export type TranscriptFilter =
  | { kind: "category"; key: string; label: string }
  | { kind: "speaker"; personId: number; label: string };

interface FilterValue {
  filter: TranscriptFilter | null;
  setFilter: (filter: TranscriptFilter | null) => void;
  /** Toggle: selecting the active filter again clears it. */
  toggleFilter: (filter: TranscriptFilter) => void;
}

const FilterContext = createContext<FilterValue | null>(null);

export const sameFilter = (a: TranscriptFilter | null, b: TranscriptFilter | null): boolean =>
  !!a && !!b && a.kind === b.kind && (a.kind === "category" ? a.key === (b as typeof a).key : a.personId === (b as typeof a).personId);

export function TranscriptFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<TranscriptFilter | null>(null);
  const value = useMemo<FilterValue>(
    () => ({
      filter,
      setFilter,
      toggleFilter: (next) => setFilter((current) => (sameFilter(current, next) ? null : next)),
    }),
    [filter],
  );
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useTranscriptFilter(): FilterValue {
  const value = useContext(FilterContext);
  if (!value) throw new Error("useTranscriptFilter must be used inside <TranscriptFilterProvider>");
  return value;
}
