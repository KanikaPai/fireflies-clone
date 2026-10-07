import { BarChart3, CheckSquare, FileText, Lightbulb, MessageSquare, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/components/common/formatters";
import { TagBadges } from "@/components/common/TagBadges";
import { LogoMark } from "@/components/common/Logo";
import type { MeetingListItem } from "@/lib/api/types";

/** Small tinted icons for summary bullets, cycled in order (colours come from status tokens). */
const BULLET_ICONS: { icon: LucideIcon; className: string }[] = [
  { icon: BarChart3, className: "bg-info-soft text-info" },
  { icon: CheckSquare, className: "bg-success-soft text-success" },
  { icon: FileText, className: "bg-warning-soft text-warning" },
  { icon: Lightbulb, className: "bg-brand-soft text-brand" },
  { icon: Users, className: "bg-danger-soft text-danger" },
  { icon: MessageSquare, className: "bg-info-soft text-info" },
];

interface FeedMeetingProps {
  meeting: MeetingListItem;
}

/** One feed entry: logo, title, date/time and up to 5 summary bullets (preview from the list endpoint). */
export function FeedMeeting({ meeting }: FeedMeetingProps) {
  const bullets = meeting.summary_bullets;

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
          <TagBadges tags={meeting.tags} className="mt-1.5" />

          <ul className="mt-4 space-y-2.5">
            {bullets.map((bullet, index) => {
              const { icon: Icon, className } = BULLET_ICONS[index % BULLET_ICONS.length];
              return (
                <li key={bullet.start_ms} className="flex items-start gap-2.5 text-sm leading-relaxed text-text-secondary">
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded ${className}`}>
                    <Icon className="size-3" aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="font-semibold text-text-primary">{bullet.label}:</strong> {bullet.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </article>
  );
}
