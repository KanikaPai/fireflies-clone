"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

/**
 * "Search by title or keyword". On /meetings it filters the list live (debounced) through the `q` URL
 * param; elsewhere, pressing Enter jumps to /meetings?q=… (full global search arrives in Phase 7).
 */
export function TopbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onLibrary = pathname === "/meetings";
  const urlQuery = searchParams.get("q") ?? "";

  // `draft` holds what the user is typing; null means "show whatever the URL says".
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const value = draft ?? (onLibrary ? urlQuery : "");

  const applyToLibrary = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `/meetings?${query}` : "/meetings", { scroll: false });
      setDraft(null);
    });
  };

  return (
    <form
      role="search"
      className="relative w-full max-w-[300px]"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        const term = value.trim();
        if (onLibrary) {
          applyToLibrary(term);
        } else {
          router.push(term ? `/meetings?q=${encodeURIComponent(term)}` : "/meetings");
          setDraft(null);
        }
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (onLibrary) {
            clearTimeout(timer.current);
            timer.current = setTimeout(() => applyToLibrary(next), DEBOUNCE_MS);
          }
        }}
        placeholder="Search by title or keyword"
        aria-label="Search by title or keyword"
        className="h-9 border-border bg-surface-subtle pl-9 shadow-none placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:appearance-none"
      />
    </form>
  );
}
