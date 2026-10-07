import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

/** Shown for unknown URLs; themed with the app tokens so it works in light and dark mode. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild>
            <Link href="/home">Go to Home</Link>
          </Button>
        }
      />
    </main>
  );
}
