"use client";

import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { OnboardingWizard } from "@/components/provider/onboarding/OnboardingWizard";

export function OnboardingView() {
  return (
    <div className="container-servora max-w-4xl py-10">
      <AccessBoundary>
        <OnboardingWizard />
      </AccessBoundary>
    </div>
  );
}
