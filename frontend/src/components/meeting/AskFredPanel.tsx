"use client";

import { Bot, Check, Copy, LayoutGrid, SendHorizontal, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Markdown } from "@/components/common/Markdown";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/hooks/useAskChat";
import { useMe } from "@/hooks/useMe";
import type { AskCitation } from "@/lib/api/types";
import { formatClock } from "@/lib/player/timeFormat";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { useSeekTo } from "./TranscriptSync";

export const ASK_SUGGESTIONS = ["Summarize key decisions", "List action items", "Write a follow-up email", "What were the main concerns?"];

export interface AskChat {
  messages: ChatMessage[];
  pending: boolean;
  error: { question: string; message: string } | null;
  send: (question: string) => void;
  retry: () => void;
}

/** AskFred: ask questions about this meeting. Answers are Markdown with citation chips that jump to the moment. */
export function AskFredPanel({ chat }: { chat: AskChat }) {
  const { messages, pending, error, send, retry } = chat;
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { data: me } = useMe();

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, pending, error]);

  const submit = (text: string) => {
    if (!text.trim() || pending) return;
    send(text);
    setQuestion("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit(question);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4" aria-label="AskFred conversation">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Bot className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-sans text-lg font-semibold text-text-primary">Ask anything about this meeting</h2>
            <p className="mt-1.5 max-w-xs text-sm text-text-secondary">Get summaries, decisions and follow-ups from the conversation.</p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Suggested prompts">
              {ASK_SUGGESTIONS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => submit(prompt)}
                    className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-text-secondary transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-soft-foreground"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="space-y-6 py-4" aria-live="polite">
            {messages.map((message) => (
              <li key={message.id}>{message.role === "user" ? <UserBubble text={message.content} name={me?.name ?? "You"} /> : <AnswerBubble message={message} />}</li>
            ))}
            {pending && (
              <li>
                <Header role="assistant" />
                <TypingDots />
              </li>
            )}
            {error && !pending && (
              <li>
                <ErrorState title="AskFred couldn't answer" message={error.message} onRetry={retry} />
              </li>
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
        className="mx-4 mb-4 flex items-end gap-2 rounded-lg bg-surface-subtle px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring/40"
      >
        <LayoutGrid className="mb-3 size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={1000}
          placeholder="AskFred anything about the meeting"
          aria-label="Ask a question about this meeting"
          className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary [field-sizing:content]"
        />
        <Button type="submit" size="icon-sm" aria-label="Send" disabled={!question.trim() || pending} className="mb-1">
          <SendHorizontal aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

function Header({ role, name }: { role: "user" | "assistant"; name?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 text-sm font-medium text-text-primary">
      {role === "user" ? (
        <PersonAvatar name={name ?? "You"} color="var(--brand)" size="sm" className="rounded-md" />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-md bg-surface-sunken text-brand">
          <Bot className="size-4" aria-hidden="true" />
        </span>
      )}
      {role === "user" ? "You" : "AskFred"}
    </div>
  );
}

function UserBubble({ text, name }: { text: string; name: string }) {
  return (
    <div>
      <Header role="user" name={name} />
      <p className="pl-8.5 text-[14px] leading-relaxed whitespace-pre-wrap text-text-secondary">{text}</p>
    </div>
  );
}

function TypingDots() {
  return (
    <div role="status" aria-label="AskFred is typing" className="flex items-center gap-1 pl-8.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}

function AnswerBubble({ message }: { message: ChatMessage }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      notify.success("Copied");
    } catch {
      notify.error("Could not copy");
    }
  };
  return (
    <div>
      <Header role="assistant" />
      <div className="pl-8.5">
        <Markdown source={message.content} />
        {message.citations.length > 0 && (
          <ul aria-label="Sources" className="mt-3 flex flex-wrap gap-1.5">
            {message.citations.map((citation) => (
              <li key={citation.segment_id}>
                <CitationChip citation={citation} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-1 text-text-secondary">
          <Button variant="ghost" size="xs" className="gap-1 px-1.5 font-medium" onClick={() => notify.comingSoon("Automate")}>
            <Zap className="size-3.5 text-brand" aria-hidden="true" /> Automate
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Copy answer" onClick={() => void copy()}>
            <Copy aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Good answer" aria-pressed={vote === "up"} onClick={() => setVote(vote === "up" ? null : "up")} className={cn(vote === "up" && "bg-brand-soft text-brand")}>
            {vote === "up" ? <Check aria-hidden="true" /> : <ThumbsUp aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Poor answer" aria-pressed={vote === "down"} onClick={() => setVote(vote === "down" ? null : "down")} className={cn(vote === "down" && "bg-brand-soft text-brand")}>
            <ThumbsDown aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-tertiary">
          {message.source === "llm" ? "AI answers" : "Smart answers"} · Answers come from this meeting&apos;s transcript
        </p>
      </div>
    </div>
  );
}

function CitationChip({ citation }: { citation: AskCitation }) {
  const seekTo = useSeekTo();
  return (
    <button
      type="button"
      onClick={() => seekTo(citation.start_ms)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-soft-foreground"
    >
      <span className="font-medium">{citation.speaker.name}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{formatClock(citation.start_ms)}</span>
    </button>
  );
}
