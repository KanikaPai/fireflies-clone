"use client";

import { FileText, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { formatDate } from "@/components/common/formatters";
import { SafeSnippet } from "@/components/common/SafeSnippet";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearch } from "@/hooks/useSearch";
import { formatClock } from "@/lib/player/timeFormat";
import { meetingSearchHref, termFromSnippet } from "@/lib/snippet";
import { cn } from "@/lib/utils";

const LIST_DEBOUNCE_MS = 300; // live filtering of the meetings library
const SEARCH_DEBOUNCE_MS = 250; // dropdown suggestions
const MAX_PER_GROUP = 5;

interface Option {
  key: string;
  href: string;
  group: "Meetings" | "In transcripts" | "all";
  title: string;
  subtitle?: string;
  snippet?: string;
}

const searchHref = (term: string) => `/search?q=${encodeURIComponent(term)}`;

/**
 * Global search. While typing (debounced 250 ms) a dropdown lists up to 5 meeting-title matches and up to 5
 * transcript matches; ↑/↓ move, Enter opens the highlighted result (or /search?q= when none is highlighted),
 * Esc closes. On /meetings the library list also filters live through the `q` URL param.
 */
export function TopbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onLibrary = pathname === "/meetings";
  const onSearchPage = pathname === "/search";
  const urlQuery = searchParams.get("q") ?? "";

  // `draft` holds what the user is typing; null means "show whatever the URL says".
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [, startTransition] = useTransition();
  const listTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const container = useRef<HTMLFormElement>(null);
  const value = draft ?? (onLibrary || onSearchPage ? urlQuery : "");
  const term = useDebouncedValue(value.trim(), SEARCH_DEBOUNCE_MS);
  const { data, isFetching } = useSearch(open ? term : "", { limit: 10, matches_per_meeting: 2, per_category: 1 });

  const options = useMemo<Option[]>(() => {
    if (!data || !term) return [];
    const meetings: Option[] = data.results
      .filter((r) => r.title_match)
      .slice(0, MAX_PER_GROUP)
      .map((r) => ({
        key: `m-${r.meeting.id}`,
        href: meetingSearchHref(r.meeting.id, null),
        group: "Meetings",
        title: r.meeting.title,
        subtitle: formatDate(r.meeting.meeting_date),
      }));
    const transcripts: Option[] = data.results
      .flatMap((r) => r.matches.map((m) => ({ r, m })))
      .slice(0, MAX_PER_GROUP)
      .map(({ r, m }) => ({
        key: `t-${m.segment_id}`,
        href: meetingSearchHref(r.meeting.id, m.start_ms, termFromSnippet(m.snippet, term)),
        group: "In transcripts",
        title: r.meeting.title,
        subtitle: `${m.speaker.name} · ${formatClock(m.start_ms)}`,
        snippet: m.snippet,
      }));
    return [...meetings, ...transcripts, { key: "all", href: searchHref(term), group: "all", title: `See all results for “${term}”` }];
  }, [data, term]);

  const showPanel = open && value.trim().length > 0;
  const hasResults = options.length > 1;

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

  const go = (href: string) => {
    clearTimeout(listTimer.current);
    setOpen(false);
    setActive(-1);
    router.push(href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!showPanel || options.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    }
  };

  return (
    <form
      ref={container}
      role="search"
      className="relative w-full max-w-[300px]"
      onBlur={(event) => {
        if (!container.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const typed = value.trim();
        if (active >= 0 && options[active]) return go(options[active].href);
        if (!typed) {
          if (onLibrary) applyToLibrary("");
          return;
        }
        go(searchHref(typed));
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
      <Input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="topbar-search-results"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `topbar-search-option-${active}` : undefined}
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          setOpen(true);
          setActive(-1);
          if (onLibrary) {
            clearTimeout(listTimer.current);
            listTimer.current = setTimeout(() => applyToLibrary(next), LIST_DEBOUNCE_MS);
          }
        }}
        placeholder="Search by title or keyword"
        aria-label="Search by title or keyword"
        className="h-9 border-border bg-surface-subtle pl-9 shadow-none placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:appearance-none"
      />

      {showPanel && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-popover shadow-popover">
          <ul id="topbar-search-results" role="listbox" aria-label="Search results" className="max-h-[70vh] overflow-y-auto py-1">
            {!data && <li className="px-4 py-3 text-sm text-text-tertiary">Searching…</li>}
            {data && !hasResults && !isFetching && <li className="px-4 py-3 text-sm text-text-tertiary">No matches yet. Press Enter to search everything.</li>}
            {options.map((option, index) => {
              const showHeading = option.group !== "all" && options[index - 1]?.group !== option.group;
              return (
                <li key={option.key} role="presentation">
                  {showHeading && <p className="px-4 pt-2 pb-1 text-[11px] font-medium tracking-wider text-text-tertiary uppercase">{option.group}</p>}
                  <div
                    id={`topbar-search-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseDown={(event) => event.preventDefault()} // keep focus in the input so blur doesn't close first
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(option.href)}
                    className={cn(
                      "cursor-pointer px-4 py-2 text-sm",
                      index === active ? "bg-brand-soft" : "hover:bg-surface-hover",
                      option.group === "all" && "mt-1 border-t border-border font-medium text-brand",
                    )}
                  >
                    {option.group === "all" ? (
                      option.title
                    ) : (
                      <>
                        <p className="flex items-center gap-2 font-medium text-text-primary">
                          <FileText className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
                          <span className="truncate">{option.title}</span>
                        </p>
                        {option.snippet && <SafeSnippet snippet={option.snippet} className="mt-0.5 line-clamp-2 block text-[13px] text-text-secondary" />}
                        <p className="mt-0.5 text-xs text-text-tertiary">{option.subtitle}</p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </form>
  );
}
