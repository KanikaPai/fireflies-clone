"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CATEGORIES, filterIntegrations, type IntegrationCategory } from "@/lib/integrations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** Grid of integration cards with category filter pills. Every Connect button is a placeholder. */
export function IntegrationsPage() {
  const [category, setCategory] = useState<IntegrationCategory | "All">("All");
  const visible = filterIntegrations(category);

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
      <h1 className="font-sans text-xl font-medium text-text-primary">Integrations</h1>
      <p className="mt-1 text-sm text-text-secondary">Connect Fireflies with the tools your team already uses.</p>

      <div role="group" aria-label="Filter by category" className="mt-5 flex flex-wrap gap-2">
        {(["All", ...CATEGORIES] as const).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              category === name ? "border-brand bg-brand-soft text-brand-soft-foreground" : "border-border bg-surface text-text-secondary hover:bg-surface-hover",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((integration) => (
          <li key={integration.name} className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                style={{ backgroundColor: integration.color }}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-semibold text-white"
              >
                {integration.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-medium text-text-primary">{integration.name}</h2>
                <p className="text-xs text-text-tertiary">{integration.category}</p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">{integration.description}</p>
            <Button variant="outline" className="mt-4 w-full" aria-label={`Connect ${integration.name}`} onClick={() => notify.info("Integrations are coming soon")}>
              Connect
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
