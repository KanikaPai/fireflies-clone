import type { FormEvent, ReactNode, RefObject } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Footer actions, rendered right-aligned under a divider. */
  footer?: ReactNode;
  /** When set, the body and footer are wrapped in a <form>, so Enter submits and submit buttons work. */
  onSubmit?: () => void;
  /** Element to focus when the modal opens (default: the first focusable element). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  /** Override the title style (the Share modal uses a larger, bolder title). */
  titleClassName?: string;
}

/**
 * The one modal used across the app: white card, title + close header, light dividers.
 * (Matches the "Create Playlist" modal.) Radix provides Esc-to-close, the focus trap and focus return to
 * the trigger; `onSubmit` adds Enter-to-submit.
 */
export function Modal({ open, onOpenChange, title, description, children, footer, onSubmit, initialFocusRef, className, titleClassName }: ModalProps) {
  const body = (
    <>
      <div className="space-y-4 px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </>
  );
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("gap-0 overflow-hidden rounded-lg bg-surface p-0 sm:max-w-[440px]", className)}
        onOpenAutoFocus={(event) => {
          if (!initialFocusRef?.current) return;
          event.preventDefault();
          initialFocusRef.current.focus();
        }}
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className={cn("font-heading text-[15px] font-medium text-text-primary", titleClassName)}>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm text-text-secondary">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
        {onSubmit ? (
          <form onSubmit={handleSubmit} noValidate>
            {body}
          </form>
        ) : (
          body
        )}
      </DialogContent>
    </Dialog>
  );
}
