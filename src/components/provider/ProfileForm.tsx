"use client";

import { useState, type FormEvent } from "react";
import type { ZodIssue } from "zod";
import { ApiError } from "@/lib/api/client";
import { createMyProvider, updateMyProvider, uploadMyProfilePhoto, validateProfilePhoto } from "@/lib/api/provider";
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

/** Never send a key with an undefined or empty-string value. */
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const raw = {
      displayName: values.displayName,
      bio: values.bio.trim() || undefined,
      // Existing photo references stay untouched unless the provider selects
      // a replacement; the browser never accepts a pasted URL.
      profilePhotoUrl: undefined,
      yearsExperience: values.yearsExperience.trim() === "" ? undefined : values.yearsExperience,
      businessName: values.businessName.trim() || undefined,
      languages: values.languages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      timezone: values.timezone.trim() || undefined,
    };

    setFieldErrors({});
    if (photoError) {
      setFormError(photoError);
      return;
    }
    setSubmitting(true);
    try {
      const parsed = mode === "create" ? createProviderSchema.safeParse(raw) : updateProviderSchema.safeParse(raw);
      if (!parsed.success) {
        setFieldErrors(collectFieldErrors(parsed.error.issues));
        return;
      }

      let uploadedPhotoUrl: string | undefined;
      if (photo) {
        uploadedPhotoUrl = await uploadMyProfilePhoto(photo);
      }
      const input = omitEmptyOptionals({ ...parsed.data, profilePhotoUrl: uploadedPhotoUrl });
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
      <Input
        label="Display name"
        required
        value={values.displayName}
        onChange={(e) => update("displayName", e.target.value)}
        errorText={fieldErrors.displayName}
        placeholder="e.g. Jordan Lee Plumbing"
      />
      <p className="text-sm text-muted">
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
        label="Business or professional name"
        value={values.businessName}
        onChange={(e) => update("businessName", e.target.value)}
        errorText={fieldErrors.businessName}
        helperText="Optional — use this if you work under a business name."
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="profile-photo">Profile photo</label>
        <input
          id="profile-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          disabled={submitting}
          onChange={(event) => {
            const nextPhoto = event.target.files?.[0] ?? null;
            const error = nextPhoto ? validateProfilePhoto(nextPhoto) : null;
            setPhoto(error ? null : nextPhoto);
            setPhotoError(error);
          }}
        />
        <p className="text-xs text-muted">Optional. JPG, JPEG, PNG, or WebP, up to 5 MB.</p>
        {photo ? <p className="text-xs text-muted">Selected: {photo.name}. It uploads securely when you save.</p> : null}
        {photoError ? <p role="alert" className="text-sm text-error">{photoError}</p> : null}
      </div>
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
