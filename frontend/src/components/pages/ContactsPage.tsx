"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePeople } from "@/hooks/usePeople";

/** People you've met with: avatar, name, email, meeting count and last met date. */
export function ContactsPage() {
  const { data, isPending, error, refetch } = usePeople();
  const router = useRouter();

  if (error) return <ErrorState title="Couldn't load contacts" message={error.message} onRetry={() => void refetch()} />;
  if (data && data.length === 0) {
    return <EmptyState icon={Users} title="No contacts yet" description="People from your meetings will show up here." />;
  }

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-5xl overflow-x-auto rounded-xl bg-surface shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Contacts</caption>
          <thead>
            <tr className="border-b border-border text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
              <th scope="col" className="px-6 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Email</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Meetings</th>
              <th scope="col" className="px-6 py-3 font-medium">Last met</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} aria-hidden="true">
                  <td className="px-6 py-3"><Skeleton className="h-8 w-44" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-8" /></td>
                  <td className="px-6 py-3"><Skeleton className="h-4 w-28" /></td>
                </tr>
              ))}
            {data?.map((person) => (
              <tr
                key={person.id}
                onClick={() => router.push(`/meetings?view=all&participant=${person.id}`)}
                className="cursor-pointer hover:bg-surface-hover"
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={person.name} color={person.avatar_color} size="md" />
                    <Link href={`/meetings?view=all&participant=${person.id}`} className="font-medium text-text-primary hover:text-brand hover:underline">
                      {person.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{person.email ?? "—"}</td>
                <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{person.meeting_count}</td>
                <td className="px-6 py-3 text-text-secondary">
                  {person.last_meeting_date ? format(new Date(person.last_meeting_date), "MMM d, yyyy") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
