"use client";

import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { ServicesManager } from "@/components/provider/ServicesManager";
import { ServiceAreaManager } from "@/components/provider/ServiceAreaManager";
import { useProvider } from "@/hooks/useProvider";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ServicesView() {
  return (
    <div className="container-servora max-w-3xl py-10">
      <AccessBoundary>
        <ServicesContent />
      </AccessBoundary>
    </div>
  );
}

function ServicesContent() {
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
        description="Start onboarding before managing services and pricing."
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
        <h1 className="font-display text-h2 text-ink-900">Services & pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Pick which catalog services you offer and set your own price for each — your price is
          authoritative for your offering, independent of the catalog&apos;s reference price.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <SectionHeading title="Your services" className="mb-6" />
        <ServicesManager />
      </Card>

      <Card className="p-6 sm:p-8">
        <SectionHeading
          title="Service areas"
          description="Where you're available to work."
          className="mb-6"
        />
        <ServiceAreaManager />
      </Card>
    </div>
  );
}
