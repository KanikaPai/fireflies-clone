import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { Modal } from "./Modal";
import { SubmitButton } from "./SubmitButton";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will happen; rendered as the body. */
  children: ReactNode;
  confirmLabel: string;
  /** Red solid button for irreversible actions. */
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}

/** Cancel / confirm dialog. Enter confirms (the confirm button is focused when it opens). */
export function ConfirmModal({ open, onOpenChange, title, children, confirmLabel, destructive, pending, onConfirm }: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      initialFocusRef={confirmRef}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={title}
      onSubmit={onConfirm}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <SubmitButton type="submit" variant={destructive ? "danger" : "default"} pending={pending} ref={confirmRef}>
            {confirmLabel}
          </SubmitButton>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-text-secondary">{children}</div>
    </Modal>
  );
}
