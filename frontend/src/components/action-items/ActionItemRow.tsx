"use client";

import { CalendarDays, CalendarPlus, Trash2, UserRound } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { AutoGrowTextarea } from "@/components/common/AutoGrowTextarea";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteActionItem, useToggleActionItem, useUpdateActionItem } from "@/hooks/useActionItems";
import type { ActionItem } from "@/lib/api/types";
import { formatDueDate, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { AssigneePicker } from "./AssigneePicker";
import { DueDatePicker } from "./DueDatePicker";

interface ActionItemRowProps {
  item: ActionItem;
  /** "meeting": roomy text inside the notes column; "tasks": compact row on the Home Tasks tab. */
  variant: "meeting" | "tasks";
  /** Where the item was said: a time link (meeting page) or a deep link (Tasks tab). */
  sourceLink?: ReactNode;
}

const CHIP = "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-surface-hover";

/**
 * One action item: checkbox, click-to-edit text, due-date and assignee popovers, a source-time link and a
 * hover delete. Shared by the meeting page and the Home Tasks tab so both behave identically.
 */
export function ActionItemRow({ item, variant, sourceLink }: ActionItemRowProps) {
  const toggle = useToggleActionItem();
  const update = useUpdateActionItem();
  const remove = useDeleteActionItem();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const cancelled = useRef(false);

  const overdue = isOverdue(item.due_date, item.is_completed);
  const textSize = variant === "meeting" ? "text-[15px]" : "text-sm";

  const beginEdit = () => {
    cancelled.current = false;
    setDraft(item.text);
    setEditing(true);
  };
  const commit = () => {
    if (cancelled.current) return;
    setEditing(false);
    const next = draft.trim();
    if (!next || next === item.text) return; // an emptied text reverts instead of deleting
    update.mutate({ id: item.id, changes: { text: next } });
  };

  return (
    <li className="group/item flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-surface-hover">
      <Checkbox
        checked={item.is_completed}
        onCheckedChange={(value) => toggle.mutate({ id: item.id, completed: value === true })}
        aria-label={`Mark "${item.text}" as ${item.is_completed ? "open" : "complete"}`}
        className="mt-1"
      />

      {editing ? (
        <AutoGrowTextarea
          autoFocus
          value={draft}
          aria-label="Action item text"
          maxLength={1000}
          onFocus={(event) => event.currentTarget.setSelectionRange(draft.length, draft.length)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commit();
            } else if (event.key === "Escape") {
              event.stopPropagation();
              cancelled.current = true;
              setEditing(false);
            }
          }}
          className={cn("flex-1", textSize)}
        />
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          title="Click to edit"
          className={cn(
            "min-w-0 flex-1 cursor-text rounded text-left leading-relaxed break-words",
            textSize,
            item.is_completed ? "text-text-tertiary line-through" : variant === "meeting" ? "text-text-secondary" : "text-text-primary",
          )}
        >
          {item.text}
        </button>
      )}

      <div className="flex shrink-0 items-center gap-0.5 text-text-tertiary">
        <DueDatePicker
          value={item.due_date}
          onChange={(due) => update.mutate({ id: item.id, changes: { due_date: due } })}
          triggerLabel={item.due_date ? `Due ${formatDueDate(item.due_date)}. Change due date` : "Set due date"}
          triggerClassName={cn(CHIP, overdue && "font-medium text-danger", !item.due_date && "opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100")}
        >
          {item.due_date ? (
            <>
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatDueDate(item.due_date)}
              {overdue && <span className="sr-only"> (overdue)</span>}
            </>
          ) : (
            <CalendarPlus className="size-3.5" aria-hidden="true" />
          )}
        </DueDatePicker>

        <AssigneePicker
          meetingId={item.meeting_id}
          value={item.assignee}
          onChange={(person) => update.mutate({ id: item.id, changes: { assignee_id: person?.id ?? null }, assignee: person })}
          triggerLabel={item.assignee ? `Assigned to ${item.assignee.name}. Change assignee` : "Assign"}
          triggerClassName={CHIP}
        >
          {item.assignee ? (
            <>
              <PersonAvatar name={item.assignee.name} color={item.assignee.avatar_color} size="sm" />
              {variant === "tasks" && <span className="hidden md:inline">{item.assignee.name}</span>}
            </>
          ) : (
            <>
              <UserRound className="size-3.5" aria-hidden="true" />
              <span className={variant === "meeting" ? "sr-only" : undefined}>Unassigned</span>
            </>
          )}
        </AssigneePicker>

        {sourceLink && <span className="px-1 text-[13px]">{sourceLink}</span>}

        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Delete action item"
          onClick={() => remove.mutate(item)}
          className="text-text-tertiary opacity-0 group-hover/item:opacity-100 hover:text-danger focus-visible:opacity-100"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
