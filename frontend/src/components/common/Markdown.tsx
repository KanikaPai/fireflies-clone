import { Fragment, type ReactNode } from "react";

import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";
import { cn } from "@/lib/utils";

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.t) {
      case "text":
        return <Fragment key={i}>{node.v}</Fragment>;
      case "strong":
        return (
          <strong key={i} className="font-semibold text-text-primary">
            {renderInline(node.c)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(node.c)}</em>;
      case "code":
        return (
          <code key={i} className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.85em]">
            {node.v}
          </code>
        );
      case "link":
        return (
          <a key={i} href={node.href} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">
            {renderInline(node.c)}
          </a>
        );
      case "br":
        return <br key={i} />;
    }
  });
}

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.t) {
    case "p":
      return <p key={key}>{renderInline(block.c)}</p>;
    case "h":
      return (
        <p key={key} className={cn("font-semibold text-text-primary", block.level <= 2 ? "text-base" : "text-sm")}>
          {renderInline(block.c)}
        </p>
      );
    case "quote":
      return (
        <blockquote key={key} className="space-y-1 border-l-2 border-highlight-strong pl-3 text-text-secondary">
          {block.c.map(renderBlock)}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={key} className="space-y-1">
          {block.items.map((item, i) => (
            <li key={i} className={cn("flex gap-2", item.checked === null && "ml-4 list-disc")}>
              {item.checked !== null && (
                <input type="checkbox" checked={item.checked} readOnly tabIndex={-1} aria-label={item.checked ? "Done" : "Open"} className="mt-1.5 size-3.5 shrink-0 accent-[var(--brand)]" />
              )}
              <span className="min-w-0">{renderInline(item.c)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="ml-5 list-decimal space-y-1">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "hr":
      return <hr key={key} className="border-border" />;
  }
}

/** Renders a small, safe subset of Markdown as React elements (never raw HTML). */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={cn("space-y-2.5 text-[14px] leading-relaxed text-text-secondary", className)}>{parseMarkdown(source).map(renderBlock)}</div>;
}
