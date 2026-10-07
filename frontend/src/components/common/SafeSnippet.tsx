import { parseSnippet } from "@/lib/snippet";
import { cn } from "@/lib/utils";

/** The one place search snippets are rendered: text nodes and <mark> only, never raw HTML. */
export function SafeSnippet({ snippet, className }: { snippet: string; className?: string }) {
  return (
    <span className={className}>
      {parseSnippet(snippet).map((part, index) =>
        part.mark ? (
          <mark key={index} className={cn("rounded-sm bg-warning-soft px-0.5 font-medium text-text-primary")}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}
