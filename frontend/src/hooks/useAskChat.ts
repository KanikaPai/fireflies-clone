import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { askMeeting } from "@/lib/api/askfred";
import type { AskCitation, AskMessage } from "@/lib/api/types";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations: AskCitation[];
  source?: "llm" | "heuristic";
}

const HISTORY_TURNS = 10;

interface ChatState {
  meetingId: number;
  messages: ChatMessage[];
  pending: boolean;
  error: { question: string; message: string } | null;
}

/**
 * AskFred conversation for one meeting. Lives above the tab content so switching between Transcript and
 * AskFred keeps the chat; it resets when the meeting changes or the page reloads.
 */
export function useAskChat(meetingId: number) {
  const [state, setState] = useState<ChatState>({ meetingId, messages: [], pending: false, error: null });
  const current = useMemo<ChatState>(() => (state.meetingId === meetingId ? state : { meetingId, messages: [], pending: false, error: null }), [state, meetingId]);
  const nextId = useRef(0);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const run = useCallback(
    async (question: string, prior: ChatMessage[]) => {
      const history: AskMessage[] = prior.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content }));
      try {
        const answer = await askMeeting(meetingId, question, history);
        if (!live.current) return;
        const reply: ChatMessage = { id: nextId.current++, role: "assistant", content: answer.answer_markdown, citations: answer.citations, source: answer.source };
        setState((s) => (s.meetingId === meetingId ? { ...s, messages: [...s.messages, reply], pending: false, error: null } : s));
      } catch (error) {
        if (!live.current) return;
        const message = error instanceof Error ? error.message : "Something went wrong.";
        setState((s) => (s.meetingId === meetingId ? { ...s, pending: false, error: { question, message } } : s));
      }
    },
    [meetingId],
  );

  const send = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text || current.pending) return;
      const prior = current.messages;
      const mine: ChatMessage = { id: nextId.current++, role: "user", content: text, citations: [] };
      setState({ meetingId, messages: [...prior, mine], pending: true, error: null });
      void run(text, prior);
    },
    [current.messages, current.pending, meetingId, run],
  );

  /** Re-send the question that failed (its bubble is already in the list). */
  const retry = useCallback(() => {
    if (!current.error || current.pending) return;
    const prior = current.messages.slice(0, -1); // everything before the unanswered question
    setState({ ...current, pending: true, error: null });
    void run(current.error.question, prior);
  }, [current, run]);

  return { messages: current.messages, pending: current.pending, error: current.error, send, retry };
}
