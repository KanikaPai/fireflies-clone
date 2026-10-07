"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Highlight } from "@/lib/api/types";

interface SegmentCommentsProps {
  comments: readonly Highlight[];
  onDelete: (comment: Highlight) => void;
}

/** A comment-bubble button for a segment with comments; opens a popover listing them (author, time, quote, delete). */
export function SegmentComments({ comments, onDelete }: SegmentCommentsProps) {
  if (comments.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${comments.length} ${comments.length === 1 ? "comment" : "comments"} on this segment`}
        className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-brand hover:bg-brand-soft"
      >
        <MessageSquare className="size-3.5" aria-hidden="true" />
        {comments.length > 1 && <span className="tabular-nums">{comments.length}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0 shadow-popover">
        <ul aria-label="Comments" className="max-h-72 divide-y divide-border overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="space-y-1.5 px-3 py-3">
              <div className="flex items-center gap-2 text-xs">
                <PersonAvatar name={comment.author.name} color="var(--brand)" size="xs" />
                <span className="font-medium text-text-primary">{comment.author.name}</span>
                <span className="text-text-tertiary">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => onDelete(comment)}
                  className="ml-auto rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              {comment.quote && <blockquote className="border-l-2 border-highlight-strong pl-2 text-xs text-text-secondary italic">“{comment.quote}”</blockquote>}
              <p className="text-sm whitespace-pre-wrap text-text-primary">{comment.note}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
