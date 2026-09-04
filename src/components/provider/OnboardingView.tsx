"use client";

import { useRouter } from "next/navigation";
import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { ProfileForm } from "@/components/provider/ProfileForm";
import { useProvider } from "@/hooks/useProvider";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export function OnboardingView() {
  return (
    <div className="container-servora max-w-2xl py-10">
      <AccessBoundary>
        <OnboardingContent />
      </AccessBoundary>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const { provider, status } = useProvider(true);

  if (status === "loading") {
    return <Skeleton className="h-96 w-full" />;
  }

  if (status === "ready" && provider) {
    return (
      <Card className="flex flex-col items-start gap-3 p-8">
        <h1 className="font-display text-h3 text-ink-900">You&apos;re already set up</h1>
        <p className="text-sm text-text-secondary">
          {provider.displayName} already has a provider profile. Head to your dashboard to manage it.
        </p>
        <Button href="/" variant="primary">
          Go to dashboard
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-label uppercase text-brand-700">Become a provider</p>
        <h1 className="mt-2 font-display text-h2 text-ink-900">Set up your provider profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          This creates your provider record on Servora. You can add skills, services, pricing, and
          availability afterward from your dashboard.
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <ProfileForm mode="create" onSuccess={() => router.push("/")} />
      </Card>
    </div>
  );
}
