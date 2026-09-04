"use client";

import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { ProfileForm } from "@/components/provider/ProfileForm";
import { SkillsPicker } from "@/components/provider/SkillsPicker";
import { useProvider } from "@/hooks/useProvider";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ProfileView() {
  return (
    <div className="container-servora max-w-3xl py-10">
      <AccessBoundary>
        <ProfileContent />
      </AccessBoundary>
    </div>
  );
}

function ProfileContent() {
  const { provider, status, error, refetch } = useProvider(true);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        description={error?.message ?? "Couldn't load your profile."}
        action={
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (status === "not-onboarded") {
    return (
      <EmptyState
        title="No provider profile yet"
        description="Start onboarding to create your provider profile."
        action={
          <Button href="/onboarding" variant="primary">
            Start onboarding
          </Button>
        }
      />
    );
  }

  if (!provider) return null;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Profile</h1>
        <p className="mt-2 text-sm text-text-secondary">
          This information appears on your public provider profile once your account is active.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <SectionHeading title="Professional information" className="mb-6" />
        <ProfileForm mode="update" initialProvider={provider} onSuccess={() => void refetch()} />
      </Card>

      <Card className="p-6 sm:p-8">
        <SectionHeading
          title="Skills"
          description="Select the skills that best describe your expertise."
          className="mb-6"
        />
        <SkillsPicker />
      </Card>
    </div>
  );
}
