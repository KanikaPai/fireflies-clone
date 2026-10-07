import type { Chapter } from "@/lib/api/types";

import { TimeLink } from "./TimeLink";

/** Notes: per chapter a heading, a paragraph ending in a time link, then timestamped bullet points. */
export function NotesSection({ chapters }: { chapters: Chapter[] }) {
  if (chapters.length === 0) return null;
  return (
    <section aria-labelledby="notes-heading" className="mt-10">
      <h2 id="notes-heading" className="font-sans text-[17px] font-medium text-text-secondary">
        Notes
      </h2>
      <div className="mt-5 space-y-7">
        {chapters.map((chapter) => (
          <article key={chapter.id}>
            <h3 className="font-sans text-[15px] font-semibold text-text-primary">{chapter.title}</h3>
            {chapter.summary && (
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                {chapter.summary} <TimeLink ms={chapter.start_ms} />.
              </p>
            )}
            {chapter.points.length > 0 && (
              <ul className="mt-3 space-y-2 pl-1">
                {chapter.points.map((point, index) => (
                  <li key={`${index}-${point.start_ms}`} className="flex gap-3 text-[15px] leading-relaxed text-text-secondary">
                    <span aria-hidden="true" className="mt-[11px] size-1.5 shrink-0 rounded-full bg-text-primary" />
                    <span>
                      {point.text} <TimeLink ms={point.start_ms} />.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
