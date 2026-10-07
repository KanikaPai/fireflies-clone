"use client";

import { Bot, LayoutGrid, SendHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

const SUGGESTIONS = ["Summarize key decisions", "List action items", "Write a follow-up email", "What risks were raised?"];

/** AskFred UI shell: suggested prompts and an input. Real chat arrives in Phase 7. */
export function AskFredPanel() {
  const [question, setQuestion] = useState("");

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    notify.comingSoon("AskFred");
    setQuestion("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Bot className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-sans text-lg font-semibold text-text-primary">Ask anything about this meeting</h2>
        <p className="mt-1.5 max-w-xs text-sm text-text-secondary">Get summaries, decisions and follow-ups from the conversation.</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Suggested prompts">
          {SUGGESTIONS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => setQuestion(prompt)}
                className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-text-secondary transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-soft-foreground"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={send} className="flex items-center gap-2 rounded-lg bg-surface-subtle px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
        <LayoutGrid className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="AskFred anything about the meeting"
          aria-label="Ask a question about this meeting"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
        />
        <Button type="submit" size="icon-sm" aria-label="Send" disabled={!question.trim()}>
          <SendHorizontal aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
