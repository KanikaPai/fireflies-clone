import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** The control (select, switch...). Rendered under the text, or beside it when `inline`. */
  children: ReactNode;
  /** Put the control on the right of the text (switches). */
  inline?: boolean;
  id?: string;
}

/** A settings card: icon, bold title, grey description and the control, like the privacy-settings screenshots. */
export function SettingsCard({ icon: Icon, title, description, children, inline, id }: SettingsCardProps) {
  const text = (
    <div className="min-w-0">
      <h3 id={id} className="text-[15px] font-medium text-text-primary">
        {title}
      </h3>
      {description && <p className="mt-0.5 text-sm text-text-tertiary">{description}</p>}
    </div>
  );
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex gap-4">
        <Icon className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden="true" />
        {inline ? (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
            {text}
            {children}
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-3">
            {text}
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
