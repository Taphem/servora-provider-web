"use client";

import { useState, type FormEvent } from "react";
import type { ZodIssue } from "zod";
import { ApiError } from "@/lib/api/client";
import { createMyProvider, updateMyProvider } from "@/lib/api/provider";
import { createProviderSchema, updateProviderSchema } from "@/lib/validation/provider";
import type { CreateProviderInput, Provider } from "@/types/domain";
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

/** Never send a key with an undefined or empty-string value — omit it entirely rather than let servora-provider see e.g. `slug: ""`. */
function omitEmptyOptionals<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue;
    (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

interface ProfileFormProps {
  mode: "create" | "update";
  initialProvider?: Provider | null;
  onSuccess: (provider: Provider) => void;
}

interface FormState {
  displayName: string;
  slug: string;
  bio: string;
  profilePhotoUrl: string;
  yearsExperience: string;
  businessName: string;
  languages: string;
  timezone: string;
}

function toFormState(provider?: Provider | null): FormState {
  return {
    displayName: provider?.displayName ?? "",
    slug: provider?.slug ?? "",
    bio: provider?.bio ?? "",
    profilePhotoUrl: provider?.profilePhotoUrl ?? "",
    yearsExperience: provider?.yearsExperience != null ? String(provider.yearsExperience) : "",
    businessName: provider?.businessName ?? "",
    languages: provider?.languages?.join(", ") ?? "",
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
      slug: values.slug.trim() || undefined,
      bio: values.bio.trim() || undefined,
      profilePhotoUrl: values.profilePhotoUrl.trim() || undefined,
      yearsExperience: values.yearsExperience.trim() === "" ? undefined : values.yearsExperience,
      businessName: values.businessName.trim() || undefined,
      languages: values.languages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      timezone: values.timezone.trim() || undefined,
    };

    setFieldErrors({});
    setSubmitting(true);
    try {
      let provider;
      if (mode === "create") {
        const parsed = createProviderSchema.safeParse(raw);
        if (!parsed.success) {
          setFieldErrors(collectFieldErrors(parsed.error.issues));
          setSubmitting(false);
          return;
        }
        // displayName is guaranteed non-empty by createProviderSchema's min(2), so
        // omitEmptyOptionals (which only strips "" and undefined) can never drop it.
        provider = await createMyProvider(omitEmptyOptionals(parsed.data) as CreateProviderInput);
      } else {
        const parsed = updateProviderSchema.safeParse(raw);
        if (!parsed.success) {
          setFieldErrors(collectFieldErrors(parsed.error.issues));
          setSubmitting(false);
          return;
        }
        provider = await updateMyProvider(omitEmptyOptionals(parsed.data));
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
      <Input
        label="Display name"
        required
        value={values.displayName}
        onChange={(e) => update("displayName", e.target.value)}
        errorText={fieldErrors.displayName}
        placeholder="e.g. Jordan Lee Plumbing"
      />
      <Input
        label="URL slug"
        value={values.slug}
        onChange={(e) => update("slug", e.target.value)}
        errorText={fieldErrors.slug}
        helperText="Lowercase letters, numbers and hyphens. Leave blank to have one generated."
        placeholder="jordan-lee-plumbing"
      />
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
      <Input
        label="Profile photo URL"
        value={values.profilePhotoUrl}
        onChange={(e) => update("profilePhotoUrl", e.target.value)}
        errorText={fieldErrors.profilePhotoUrl}
        helperText="Optional — a direct link to an image. No upload is available yet."
        placeholder="https://..."
      />
      <Input
        label="Languages"
        value={values.languages}
        onChange={(e) => update("languages", e.target.value)}
        errorText={fieldErrors.languages}
        helperText="Comma-separated 2-letter codes, e.g. en, es"
        placeholder="en, es"
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
