import { cn } from "@/lib/utils";

import { initialOf } from "./formatters";

interface PersonAvatarProps {
  name: string;
  /** Hex colour from people.avatar_color (a data value, not a theme colour). */
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
  lg: "size-10 text-base",
} as const;

/** Circular avatar showing a person's initial on their avatar colour. */
export function PersonAvatar({ name, color, size = "md", className }: PersonAvatarProps) {
  return (
    <span
      aria-hidden="true"
      title={name}
      style={{ backgroundColor: color }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        SIZES[size],
        className,
      )}
    >
      {initialOf(name)}
    </span>
  );
}

interface AvatarStackProps {
  people: { id: number; name: string; avatar_color: string }[];
  max?: number;
  size?: PersonAvatarProps["size"];
}

/** Overlapping avatars with a "+N" overflow chip. */
export function AvatarStack({ people, max = 3, size = "sm" }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex items-center" aria-label={people.map((p) => p.name).join(", ")}>
      {shown.map((person) => (
        <PersonAvatar
          key={person.id}
          name={person.name}
          color={person.avatar_color}
          size={size}
          className="-ml-1.5 ring-2 ring-surface first:ml-0"
        />
      ))}
      {extra > 0 && <span className="ml-1.5 text-xs font-medium text-text-secondary">+{extra}</span>}
    </span>
  );
}
