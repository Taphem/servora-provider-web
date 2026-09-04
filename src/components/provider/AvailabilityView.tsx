"use client";

import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { WeeklyAvailabilityEditor } from "@/components/provider/WeeklyAvailabilityEditor";
import { DateOverrideEditor } from "@/components/provider/DateOverrideEditor";
import { useProvider } from "@/hooks/useProvider";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function AvailabilityView() {
  return (
    <div className="container-servora max-w-3xl py-10">
      <AccessBoundary>
        <AvailabilityContent />
      </AccessBoundary>
    </div>
  );
}

function AvailabilityContent() {
  const { status, error, refetch } = useProvider(true);

  if (status === "loading") {
    return <Skeleton className="h-96 w-full" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        description={error?.message ?? "Couldn't load your provider profile."}
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
        description="Start onboarding before setting your availability."
        action={
          <Button href="/onboarding" variant="primary">
            Start onboarding
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Availability</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Set your general weekly hours, then use date overrides for exceptions like holidays or a
          different schedule on a specific day. This reflects when you generally work — it does not
          reserve or lock individual booking slots.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <SectionHeading title="Weekly hours" className="mb-6" />
        <WeeklyAvailabilityEditor />
      </Card>

      <Card className="p-6 sm:p-8">
        <SectionHeading title="Date overrides" className="mb-6" />
        <DateOverrideEditor />
      </Card>
    </div>
  );
}
