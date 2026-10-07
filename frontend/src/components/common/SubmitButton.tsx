import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pending?: boolean;
}

/** Button that shows a spinner and disables itself while a mutation is in flight. */
export function SubmitButton({ pending = false, disabled, children, ...props }: SubmitButtonProps) {
  return (
    <Button disabled={disabled || pending} aria-busy={pending || undefined} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}
