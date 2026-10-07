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
