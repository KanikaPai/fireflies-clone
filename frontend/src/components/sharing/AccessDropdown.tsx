"use client";

import { Check, ChevronDown } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Privacy } from "@/lib/api/types";
import { PRIVACY_OPTIONS, SHARE_PRIVACY_LEVELS } from "@/lib/privacy";

interface AccessDropdownProps {
  value: Privacy;
  onChange: (value: Privacy) => void;
  disabled?: boolean;
}

/** "Teammates & Anyone with Link ▾" with a one-line description underneath, and the five access levels. */
export function AccessDropdown({ value, onChange, disabled }: AccessDropdownProps) {
  const current = PRIVACY_OPTIONS[value];
  const CurrentIcon = current.icon;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary">
        <CurrentIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            aria-label={`Who can access: ${current.shareLabel}`}
            className="flex max-w-full items-center gap-1 rounded text-[15px] font-medium text-text-primary disabled:opacity-60"
          >
            <span className="truncate">{current.shareLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {SHARE_PRIVACY_LEVELS.map((level) => {
              const { icon: Icon, shareLabel } = PRIVACY_OPTIONS[level];
              return (
                <DropdownMenuItem key={level} onSelect={() => level !== value && onChange(level)} className="gap-3 py-2">
                  <Icon className="size-4 text-text-secondary" aria-hidden="true" />
                  <span className="flex-1">{shareLabel}</span>
                  {level === value && <Check className="size-4 text-brand" aria-hidden="true" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="truncate text-[13px] text-text-tertiary">{current.description}</p>
      </div>
    </div>
  );
}
