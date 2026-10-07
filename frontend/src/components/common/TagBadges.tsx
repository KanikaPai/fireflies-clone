import Link from "next/link";

import type { Tag } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** URL of the library filtered to one tag. */
const tagHref = (tagId: number): string => `/meetings?view=all&tag_id=${tagId}`;

/** Tag colours are data (hex); tint the badge with it and keep the label readable in both themes. */
function TagBadge({ tag }: { tag: Pick<Tag, "id" | "name" | "color"> }) {
  return (
    <Link
      href={tagHref(tag.id)}
      aria-label={`Show meetings tagged ${tag.name}`}
      className="pointer-events-auto relative z-10 inline-flex max-w-32 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium hover:underline"
      style={{
        backgroundColor: `color-mix(in srgb, ${tag.color} 16%, transparent)`,
        color: `color-mix(in srgb, ${tag.color} 55%, var(--text-primary))`,
      }}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      <span className="truncate">{tag.name}</span>
    </Link>
  );
}

interface TagBadgesProps {
  tags: readonly Pick<Tag, "id" | "name" | "color">[];
  /** Show at most this many badges, then "+N". */
  max?: number;
  className?: string;
}

/** A row of clickable tag badges; each links to the library filtered by that tag. */
export function TagBadges({ tags, max = 3, className }: TagBadgesProps) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
      {tags.length > max && <span className="text-xs text-text-tertiary">+{tags.length - max}</span>}
    </span>
  );
}
