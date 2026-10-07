import { cn } from "@/lib/utils";

/** Original flame-style mark for the fireflies.ai wordmark (a clone-specific logo, not the real asset). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <path d="M4 4h14a6 6 0 0 1 0 12h-6v12H4z" className="fill-brand" />
      <path d="M20 20h8v8h-8z" className="fill-[var(--logo-accent)]" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-heading text-[19px] font-semibold tracking-tight text-text-primary">fireflies.ai</span>
    </span>
  );
}
