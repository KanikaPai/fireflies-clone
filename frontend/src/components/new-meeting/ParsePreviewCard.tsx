import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { formatDuration, pluralize } from "@/components/common/formatters";
import type { ParsePreview } from "@/lib/api/types";
import { formatClock } from "@/lib/player/timeFormat";

interface ParsePreviewCardProps {
  data: ParsePreview | undefined;
  error: Error | null;
  loading: boolean;
}

const FORMAT_LABELS: Record<string, string> = { txt: "Plain text (.txt)", vtt: "WebVTT (.vtt)", json: "JSON (.json)" };

/** What the transcript will become: detected format, size, speakers (new vs existing) and the first lines. */
export function ParsePreviewCard({ data, error, loading }: ParsePreviewCardProps) {
  if (loading) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-4 py-3 text-sm text-text-secondary">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Reading transcript…
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{error.message}</span>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-subtle" aria-label="Transcript preview">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-medium text-text-primary">
        <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Transcript looks good
      </div>
      <dl className="grid grid-cols-3 gap-3 px-4 py-3 text-[13px]">
        <div>
          <dt className="text-text-tertiary">Format</dt>
          <dd className="font-medium text-text-primary">{FORMAT_LABELS[data.format_detected] ?? data.format_detected}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Segments</dt>
          <dd className="font-medium text-text-primary">{data.segment_count}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Duration</dt>
          <dd className="font-medium text-text-primary">{formatDuration(data.duration_seconds)}</dd>
        </div>
      </dl>
      <div className="px-4 pb-3">
        <p className="text-[13px] text-text-tertiary">{pluralize(data.speakers.length, "speaker")}</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Speakers">
          {data.speakers.map((speaker) => (
            <li key={speaker.name} className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pr-1 pl-2.5 text-xs text-text-primary">
              {speaker.name}
              <span
                className={
                  speaker.matched_person_id === null
                    ? "rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand-soft-foreground"
                    : "rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success"
                }
              >
                {speaker.matched_person_id === null ? "New contact" : "Existing contact"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <ol className="space-y-1.5 border-t border-border px-4 py-3" aria-label="First lines">
        {data.preview.map((line, index) => (
          <li key={index} className="flex gap-2 text-[13px] leading-snug">
            <span className="w-10 shrink-0 text-text-tertiary tabular-nums">{formatClock(line.start_ms)}</span>
            <span className="min-w-0 text-text-secondary">
              <strong className="font-medium text-text-primary">{line.speaker}:</strong> <span className="line-clamp-2">{line.text}</span>
            </span>
          </li>
        ))}
        {data.segment_count > data.preview.length && (
          <li className="pl-12 text-xs text-text-tertiary">+ {data.segment_count - data.preview.length} more</li>
        )}
      </ol>
      {data.warnings.length > 0 && (
        <ul className="space-y-1 border-t border-border bg-warning-soft px-4 py-2.5" aria-label="Warnings">
          {data.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
