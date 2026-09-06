"use client";

import { useState, type FormEvent } from "react";
import type { ZodIssue } from "zod";
import { ApiError } from "@/lib/api/client";
import { createMyProvider, updateMyProvider } from "@/lib/api/provider";
import { createProviderSchema, updateProviderSchema } from "@/lib/validation/provider";
import { omitEmptyOptionals } from "@/lib/omitEmpty";
import type { CreateProviderInput, Provider } from "@/types/domain";
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

interface ProfileFormProps {
  mode: "create" | "update";
  initialProvider?: Provider | null;
  onSuccess: (provider: Provider) => void;
}

interface FormState {
  displayName: string;
  bio: string;
  profilePhotoUrl: string;
  yearsExperience: string;
  businessName: string;
  languages: string[];
  timezone: string;
}

function toFormState(provider?: Provider | null): FormState {
  return {
    displayName: provider?.displayName ?? "",
    bio: provider?.bio ?? "",
    profilePhotoUrl: provider?.profilePhotoUrl ?? "",
    yearsExperience: provider?.yearsExperience != null ? String(provider.yearsExperience) : "",
    businessName: provider?.businessName ?? "",
    languages: provider?.languages ?? [],
    timezone: provider?.timezone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"),
  };
}

export function ProfileForm({ mode, initialProvider, onSuccess }: ProfileFormProps) {
  const [values, setValues] = useState<FormState>(() => toFormState(initialProvider));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const raw = {
      displayName: values.displayName,
      bio: values.bio.trim() || undefined,
      profilePhotoUrl: values.profilePhotoUrl || undefined,
      yearsExperience: values.yearsExperience.trim() === "" ? undefined : values.yearsExperience,
      businessName: values.businessName.trim() || undefined,
      languages: values.languages,
      timezone: values.timezone.trim() || undefined,
    };

    setFieldErrors({});
    setSubmitting(true);
    try {
      const parsed = mode === "create" ? createProviderSchema.safeParse(raw) : updateProviderSchema.safeParse(raw);
      if (!parsed.success) {
        setFieldErrors(collectFieldErrors(parsed.error.issues));
        return;
      }

      const input = omitEmptyOptionals(parsed.data);
      let provider;
      if (mode === "create") {
        provider = await createMyProvider(input as CreateProviderInput);
      } else {
        provider = await updateMyProvider(input);
      }
      onSuccess(provider);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <PhotoUploader
        value={values.profilePhotoUrl || null}
        onUploaded={(url) => update("profilePhotoUrl", url)}
        onRemove={() => update("profilePhotoUrl", "")}
        disabled={submitting}
      />
      <Input
        label="Display name"
        required
        value={values.displayName}
        onChange={(e) => update("displayName", e.target.value)}
        errorText={fieldErrors.displayName}
        placeholder="e.g. Priya Sharma"
      />
      <p className="text-sm text-text-muted">
        Your public profile URL is created automatically from your display name. We keep it stable after your profile is created.
      </p>
      <Textarea
        label="Bio"
        value={values.bio}
        onChange={(e) => update("bio", e.target.value)}
        errorText={fieldErrors.bio}
        helperText="A short introduction customers will see on your public profile."
        placeholder="Tell customers what you do and why they should book you."
      />
      <Input
        label="Business name"
        value={values.businessName}
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
          value={values.yearsExperience}
          onChange={(e) => update("yearsExperience", e.target.value)}
          errorText={fieldErrors.yearsExperience}
        />
        <Input
          label="Time zone"
          value={values.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          errorText={fieldErrors.timezone}
          helperText="IANA time zone, e.g. America/New_York"
        />
      </div>
      <LanguageMultiSelect
        value={values.languages}
        onChange={(languages) => update("languages", languages)}
        errorText={fieldErrors.languages}
      />

      {formError ? (
        <p role="alert" className="text-sm text-error">
          {formError}
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={submitting}>
          {mode === "create" ? "Create provider profile" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
