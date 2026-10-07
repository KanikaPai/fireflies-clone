import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EmptyState } from "./EmptyState";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={message ?? "We couldn't load this. Please try again."}
      action={
        onRetry && (
          <Button onClick={onRetry} className="bg-brand text-brand-foreground hover:bg-brand-hover">
            Try again
          </Button>
        )
      }
    />
  );
}
