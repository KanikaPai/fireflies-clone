import { BarChart3, CheckSquare, FileText, Lightbulb, MessageSquare, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/components/common/formatters";
import { LogoMark } from "@/components/common/Logo";
import type { MeetingDetail } from "@/lib/api/types";

/** Small tinted icons for summary bullets, cycled in order (colours come from status tokens). */
const BULLET_ICONS: { icon: LucideIcon; className: string }[] = [
  { icon: BarChart3, className: "bg-info-soft text-info" },
  { icon: CheckSquare, className: "bg-success-soft text-success" },
  { icon: FileText, className: "bg-warning-soft text-warning" },
  { icon: Lightbulb, className: "bg-brand-soft text-brand" },
  { icon: Users, className: "bg-danger-soft text-danger" },
  { icon: MessageSquare, className: "bg-info-soft text-info" },
];

const MAX_BULLETS = 5;

interface FeedMeetingProps {
  meeting: MeetingDetail;
}

/** One feed entry: logo, title, date/time and 3-5 summary bullets derived from the chapters. */
export function FeedMeeting({ meeting }: FeedMeetingProps) {
  const bullets = meeting.chapters.slice(0, MAX_BULLETS).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    text: chapter.summary ?? "",
  }));
  // Fall back to summary keywords if the meeting has no chapters yet.
  const keywordBullets = bullets.length === 0 ? (meeting.summary?.keywords ?? []).slice(0, 3) : [];

  return (
    <article className="py-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
          <LogoMark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-[15px] font-semibold text-text-primary">
            <Link href={`/meetings/${meeting.id}`} className="hover:text-brand hover:underline">
              {meeting.title}
            </Link>
          </h3>
          <p className="text-[13px] text-text-tertiary">{formatDateTime(meeting.meeting_date)}</p>

          <ul className="mt-4 space-y-2.5">
            {bullets.map((bullet, index) => {
              const { icon: Icon, className } = BULLET_ICONS[index % BULLET_ICONS.length];
              return (
                <li key={bullet.id} className="flex items-start gap-2.5 text-sm leading-relaxed text-text-secondary">
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded ${className}`}>
                    <Icon className="size-3" aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="font-semibold text-text-primary">{bullet.title}:</strong> {bullet.text}
                  </span>
                </li>
              );
            })}
            {keywordBullets.map((keyword) => (
              <li key={keyword} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-brand-soft text-brand">
                  <Lightbulb className="size-3" aria-hidden="true" />
                </span>
                <span className="capitalize">{keyword}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
