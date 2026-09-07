"use client";

import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { OnboardingWizard } from "@/components/provider/onboarding/OnboardingWizard";

export function OnboardingView() {
  return (
    <div className="container-servora max-w-6xl py-8 sm:py-10">
      <AccessBoundary>
        <OnboardingWizard />
      </AccessBoundary>
    </div>
  );
}
