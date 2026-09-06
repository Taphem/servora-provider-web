"use client";

import { useState, type FormEvent } from "react";
import type { ZodIssue } from "zod";
import { createProviderSchema } from "@/lib/validation/provider";
import type { AboutYouDraft } from "@/components/provider/onboarding/types";
import { PhotoUploader } from "@/components/provider/PhotoUploader";
import { LanguageMultiSelect } from "@/components/provider/LanguageMultiSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

function collectFieldErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

interface StepAboutYouProps {
  value: AboutYouDraft;
  onChange: (next: AboutYouDraft) => void;
  onContinue: () => Promise<void>;
}

export function StepAboutYou({ value, onChange, onContinue }: StepAboutYouProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof AboutYouDraft>(key: K, next: AboutYouDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const raw = {
      displayName: value.displayName,
      bio: value.bio.trim() || undefined,
      businessName: value.businessName.trim() || undefined,
      yearsExperience: value.yearsExperience.trim() === "" ? undefined : value.yearsExperience,
      languages: value.languages,
      timezone: value.timezone.trim() || undefined,
    };

    const parsed = createProviderSchema.safeParse(raw);
    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onContinue();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <div>
        <h1 className="font-display text-h2 text-ink-900">Tell customers about yourself</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
          This becomes your public professional profile — the first thing customers see before they
          book you. It only takes a minute, whether you work solo or run a small team.
        </p>
      </div>

      <PhotoUploader value={value.photoUrl || null} onUploaded={(url) => update("photoUrl", url)} onRemove={() => update("photoUrl", "")} />

      <Input
        label="Display name"
        required
        value={value.displayName}
        onChange={(e) => update("displayName", e.target.value)}
        errorText={fieldErrors.displayName}
        placeholder="e.g. Priya Sharma"
        helperText="Your public professional name — this is how customers will know you."
      />

      <Textarea
        label="Bio"
        value={value.bio}
        onChange={(e) => update("bio", e.target.value)}
        errorText={fieldErrors.bio}
        helperText="A short introduction customers will see on your profile. Optional."
        placeholder="Tell customers what you do and why they should book you."
      />

      <Input
        label="Business name"
        value={value.businessName}
        onChange={(e) => update("businessName", e.target.value)}
        errorText={fieldErrors.businessName}
        helperText="Optional — leave this blank if you work under your own name."
        placeholder="Optional"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Years of experience"
          type="number"
          min={0}
          max={100}
          value={value.yearsExperience}
          onChange={(e) => update("yearsExperience", e.target.value)}
          errorText={fieldErrors.yearsExperience}
          helperText="Optional"
        />
        <Input
          label="Time zone"
          value={value.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          errorText={fieldErrors.timezone}
          helperText="Detected automatically — change it if this isn't right."
        />
      </div>

      <LanguageMultiSelect
        value={value.languages}
        onChange={(languages) => update("languages", languages)}
        errorText={fieldErrors.languages}
        helperText="Search and select every language you can comfortably work in."
      />

      {formError ? (
        <p role="alert" className="text-sm text-error">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Continue
        </Button>
      </div>
    </form>
  );
}
