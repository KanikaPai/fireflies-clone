/** Stand-ins for the Slack and Microsoft Teams marks (lucide has no brand icons); built from status tokens. */
export function SlackMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="9" width="8" height="3.5" rx="1.75" className="fill-info" />
      <rect x="9" y="3" width="3.5" height="8" rx="1.75" className="fill-success" />
      <rect x="13" y="11.5" width="8" height="3.5" rx="1.75" className="fill-warning" />
      <rect x="11.5" y="13" width="3.5" height="8" rx="1.75" className="fill-danger" />
    </svg>
  );
}

export function TeamsMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="5" width="14" height="14" rx="3" className="fill-brand" />
      <path d="M6.5 9.5h7M10 9.5v6" className="stroke-brand-foreground" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="18.5" cy="8" r="2.5" className="fill-brand-soft-foreground" />
      <rect x="15.5" y="12" width="6" height="7" rx="2.5" className="fill-brand-soft-foreground" />
    </svg>
  );
}
