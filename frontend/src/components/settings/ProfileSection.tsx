"use client";

import { useState, type FormEvent } from "react";

import { FormField } from "@/components/common/FormField";
import { SubmitButton } from "@/components/common/SubmitButton";
import { Input } from "@/components/ui/input";
import { useHydrated } from "@/hooks/useHydrated";
import { useMe } from "@/hooks/useMe";
import { useUpdateProfile } from "@/hooks/useSettings";
import { isValidEmail } from "@/lib/validation";

import { SectionShell } from "./SectionShell";

export function ProfileSection() {
  const hydrated = useHydrated();
  const { data: me, isPending, error, refetch } = useMe();
  return (
    <SectionShell loading={isPending || !hydrated} error={error} onRetry={() => void refetch()}>
      {me && <ProfileForm key={`${me.name}|${me.email}`} name={me.name} email={me.email} />}
    </SectionShell>
  );
}

function ProfileForm({ name: initialName, email: initialEmail }: { name: string; email: string }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const dirty = name.trim() !== initialName || email.trim() !== initialEmail;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      name: name.trim() ? undefined : "Name can't be empty.",
      email: isValidEmail(email) ? undefined : "Enter a valid email address.",
    };
    setErrors(next);
    if (next.name || next.email) return;
    update.mutate({ name: name.trim(), email: email.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="max-w-md space-y-4">
        <FormField label="Name" htmlFor="profile-name" error={errors.name}>
          <Input id="profile-name" value={name} onChange={(event) => {
              setName(event.target.value);
              setErrors({});
            }} aria-invalid={errors.name ? true : undefined} maxLength={120} />
        </FormField>
        <FormField label="Email" htmlFor="profile-email" error={errors.email}>
          <Input id="profile-email" type="email" value={email} onChange={(event) => {
              setEmail(event.target.value);
              setErrors({});
            }} aria-invalid={errors.email ? true : undefined} maxLength={255} />
        </FormField>
        <SubmitButton type="submit" pending={update.isPending} disabled={!dirty}>
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
