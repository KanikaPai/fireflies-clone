"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo, LogoMark } from "@/components/common/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { isActiveRoute, NAV_GROUPS } from "./nav";

interface SidebarProps {
  /** Icon-only rail (used on /meetings, where the notebook panel sits beside it). */
  rail?: boolean;
  /** Full-width labels at every breakpoint (used inside the mobile drawer). */
  forceExpanded?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ rail = false, forceExpanded = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  // Below `lg` the sidebar collapses to the icon rail automatically.
  const labelClass = rail ? "hidden" : forceExpanded ? "inline" : "hidden lg:inline";

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
        rail ? "w-16" : forceExpanded ? "w-64" : "w-16 lg:w-60",
      )}
    >
      <div className={cn("flex h-14 items-center", rail || !forceExpanded ? "justify-center lg:justify-start lg:px-5" : "px-5", rail && "lg:justify-center lg:px-0")}>
        <Link href="/home" aria-label="Fireflies home" onClick={onNavigate}>
          {rail ? (
            <LogoMark />
          ) : (
            <>
              <LogoMark className={forceExpanded ? "hidden" : "lg:hidden"} />
              <Logo className={forceExpanded ? "" : "hidden lg:inline-flex"} />
            </>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {NAV_GROUPS.map((group, index) => (
          <div key={index} className={cn("space-y-0.5", index > 0 && "mt-3 border-t border-sidebar-border pt-3")}>
            {group.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    rail || !forceExpanded ? "justify-center lg:justify-start" : "justify-start",
                    rail && "lg:justify-center lg:px-0",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-surface-hover hover:text-text-primary",
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span className={cn("truncate", labelClass)}>{item.label}</span>
                  {item.badge && (
                    <span className={cn("ml-auto rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-brand-foreground", labelClass)}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
              return rail ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.href}>{link}</div>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
