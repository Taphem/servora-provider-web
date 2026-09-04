"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Wrench, UserRound, Clock3, Wallet, MessageSquareText, Star } from "lucide-react";
import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { ProviderStatusBadge, VerificationStatusBadge } from "@/components/provider/StatusBadges";
import { useProvider } from "@/hooks/useProvider";
import { activateMyProvider, pauseMyProvider, submitMyVerification } from "@/lib/api/provider";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const deferredFeatures = [
  { icon: MessageSquareText, label: "Incoming service requests & quotes" },
  { icon: Clock3, label: "Active bookings & fulfillment" },
  { icon: Wallet, label: "Earnings & payouts" },
  { icon: Star, label: "Reviews & responses" },
];

export function DashboardView() {
  return (
    <div className="container-servora py-10">
      <AccessBoundary>
        <DashboardContent />
      </AccessBoundary>
    </div>
  );
}

function DashboardContent() {
  const { provider, status, error, refetch } = useProvider(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    setActionPending(true);
    try {
      await action();
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
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
        icon={<UserRound size={22} aria-hidden />}
        title="Set up your provider profile"
        description="You're signed in with provider access, but you haven't created a provider profile yet. It only takes a minute."
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-h2 text-ink-900">Welcome back, {provider.displayName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProviderStatusBadge status={provider.status} />
            <VerificationStatusBadge status={provider.verificationStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(provider.status === "PENDING_ONBOARDING" || provider.status === "PAUSED") && (
            <Button
              variant="primary"
              size="sm"
              loading={actionPending}
              onClick={() => void runAction(activateMyProvider)}
            >
              Activate
            </Button>
          )}
          {provider.status === "ACTIVE" && (
            <Button
              variant="secondary"
              size="sm"
              loading={actionPending}
              onClick={() => void runAction(pauseMyProvider)}
            >
              Pause
            </Button>
          )}
          {(provider.verificationStatus === "UNVERIFIED" || provider.verificationStatus === "REJECTED") && (
            <Button
              variant="tertiary"
              size="sm"
              loading={actionPending}
              onClick={() => void runAction(submitMyVerification)}
            >
              Submit for verification
            </Button>
          )}
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-error">
          {actionError}
        </p>
      ) : null}

      {provider.verificationStatus === "REJECTED" && provider.verificationNotes ? (
        <Card className="border-danger-100 bg-danger-100/40 p-5">
          <p className="text-sm font-medium text-ink-900">Verification feedback</p>
          <p className="mt-1 text-sm text-text-secondary">{provider.verificationNotes}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardLinkCard
          href="/profile"
          icon={UserRound}
          title="Profile"
          description="Your professional information and public details."
        />
        <DashboardLinkCard
          href="/services"
          icon={Wrench}
          title="Services & pricing"
          description="Choose which catalog services you offer and set your own prices."
        />
        <DashboardLinkCard
          href="/availability"
          icon={CalendarClock}
          title="Availability"
          description="Your weekly schedule and date-specific overrides."
        />
      </div>

      <div>
        <h2 className="font-display text-h4 text-ink-900">Coming in a later phase</h2>
        <p className="mt-1 text-sm text-text-secondary">
          These parts of the provider experience aren&apos;t built yet because the backend doesn&apos;t
          support them today — nothing here is faked.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {deferredFeatures.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface-raised/50 px-4 py-3 text-sm text-text-secondary"
            >
              <Icon size={16} className="text-ink-400" aria-hidden />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <Card interactive className="p-5">
      <Link href={href} className="flex flex-col gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon size={18} aria-hidden />
        </span>
        <div>
          <p className="font-medium text-ink-900">{title}</p>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
      </Link>
    </Card>
  );
}
