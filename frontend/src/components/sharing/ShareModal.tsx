"use client";

import { ArrowRight, Link2, Search, X } from "lucide-react";
import { useState } from "react";

import { SlackMark, TeamsMark } from "@/components/common/BrandMarks";
import { formatShareStamp } from "@/components/common/formatters";
import { Modal } from "@/components/common/Modal";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/hooks/useMe";
import { useUpdateMeeting } from "@/hooks/useMeetingMutations";
import { useInvite, useRemoveShare, useShares } from "@/hooks/useSharing";
import type { MeetingDetail } from "@/lib/api/types";
import { isValidEmail } from "@/lib/validation";
import { notify } from "@/lib/toast";

import { AccessDropdown } from "./AccessDropdown";
import { EmbedPanel } from "./EmbedPanel";

interface ShareModalProps {
  meeting: MeetingDetail | null;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ meeting, onOpenChange }: ShareModalProps) {
  return meeting ? <ShareContent meeting={meeting} onOpenChange={onOpenChange} /> : null;
}

const TAB = "h-10 flex-none rounded-none px-1 text-sm text-text-secondary data-active:text-brand-soft-foreground group-data-horizontal/tabs:after:bottom-0 after:bg-brand";

const meetingUrl = (id: number) => `${window.location.origin}/meetings/${id}`;

function ShareContent({ meeting, onOpenChange }: { meeting: MeetingDetail; onOpenChange: (open: boolean) => void }) {
  const me = useMe();
  const shares = useShares(meeting.id);
  const invite = useInvite(meeting.id);
  const remove = useRemoveShare(meeting.id);
  const updatePrivacy = useUpdateMeeting(meeting.id, "Access updated");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitInvite = () => {
    const email = value.trim();
    if (!email) return;
    if (!isValidEmail(email)) return setError("Enter a valid email address, e.g. name@company.com.");
    if (shares.data?.some((share) => share.email === email.toLowerCase())) return setError("Already shared with that email.");
    invite.mutate(email, { onSuccess: () => setValue("") });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl(meeting.id));
      notify.success("Link copied");
    } catch {
      notify.error("Couldn't copy the link");
    }
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={meeting.title}
      description={`Fireflies · ${formatShareStamp(meeting.meeting_date)}`}
      className="sm:max-w-[640px]"
      titleClassName="text-lg font-semibold"
    >
      <Tabs defaultValue="share" className="-mx-5 -my-4 gap-0">
        <TabsList variant="line" className="h-10 w-full justify-start gap-6 border-b border-border bg-transparent px-5">
          <TabsTrigger value="share" className={TAB}>
            Share
          </TabsTrigger>
          <TabsTrigger value="embed" className={TAB}>
            Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="share" className="space-y-4">
          <div className="flex items-center gap-2.5 bg-brand-soft/50 px-5 py-2.5 text-[13px] text-text-secondary">
            <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-brand-foreground">NEW</span>
            <span className="flex-1">Share with specific teams using user groups.</span>
            <button
              type="button"
              onClick={() => notify.comingSoon("User groups")}
              className="flex items-center gap-1 font-medium text-brand hover:underline"
            >
              Create Group <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submitInvite();
            }}
            className="px-5"
          >
            <div className="flex gap-3">
              <div
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 focus-within:ring-2 focus-within:ring-ring/40 ${error ? "border-destructive" : "border-border"}`}
              >
                <Search className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                <input
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Name, Email or User Group"
                  aria-label="Invite by name, email or user group"
                  aria-invalid={error ? true : undefined}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                />
              </div>
              <SubmitButton type="submit" pending={invite.isPending} disabled={!value.trim()} className="h-10 px-5">
                Invite
              </SubmitButton>
            </div>
            {error && (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {error}
              </p>
            )}
          </form>

          <div className="flex items-center gap-3 px-5 text-sm text-text-secondary">
            Share with contacts on <ArrowRight className="size-4" aria-hidden="true" />
            {[
              { name: "Microsoft Teams", mark: <TeamsMark /> },
              { name: "Slack", mark: <SlackMark /> },
            ].map(({ name, mark }) => (
              <button
                key={name}
                type="button"
                aria-label={`Share with contacts on ${name}`}
                onClick={() => notify.comingSoon(name)}
                className="flex size-10 items-center justify-center rounded-lg border border-border hover:bg-surface-hover"
              >
                {mark}
              </button>
            ))}
          </div>

          <div className="px-5">
            <h3 className="text-[13px] text-text-tertiary">Teammates with access</h3>
            <ul className="mt-2 space-y-1" aria-label="Teammates with access">
              <li className="flex items-center gap-3 py-1.5">
                <PersonAvatar name={me.data?.name ?? "You"} color="var(--brand)" size="lg" className="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{me.data?.name ?? "You"}</p>
                  <p className="truncate text-[13px] text-text-tertiary">{me.data?.email}</p>
                </div>
                <span className="text-[13px] text-text-tertiary">Host</span>
              </li>
              {shares.data?.map((share) => (
                <li key={share.id} className="flex items-center gap-3 py-1.5">
                  <PersonAvatar name={share.email} color="var(--text-tertiary)" size="lg" className="rounded-lg" />
                  <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{share.email}</p>
                  <span className="text-[13px] text-text-tertiary">Can view</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${share.email}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(share.id)}
                    className="text-text-tertiary hover:text-danger"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-text-tertiary">Invites are recorded only. No email is sent in this demo.</p>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
            <AccessDropdown value={meeting.privacy} disabled={updatePrivacy.isPending} onChange={(privacy) => updatePrivacy.mutate({ privacy })} />
            <Button variant="outline" className="h-10 shrink-0" onClick={() => void copyLink()}>
              <Link2 aria-hidden="true" /> Copy Link
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="embed" className="px-5 py-4">
          <EmbedPanel url={meetingUrl(meeting.id)} />
        </TabsContent>
      </Tabs>
    </Modal>
  );
}
