"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useProvider } from "@/hooks/useProvider";
import {
  createMyProvider,
  createMyService,
  createMyServiceArea,
  deleteMyService,
  deleteMyServiceArea,
  listMyServiceAreas,
  listMyServices,
  listMySkills,
  listMyWeeklyAvailability,
  replaceMySkills,
  replaceMyWeeklyAvailability,
  updateMyProvider,
  updateMyService,
} from "@/lib/api/provider";
import { createProviderSchema, updateProviderSchema } from "@/lib/validation/provider";
import { omitEmptyOptionals } from "@/lib/omitEmpty";
import type { CreateProviderInput } from "@/types/domain";
import {
  emptyAboutYou,
  emptyServiceAreaAvailability,
  emptySkillsServices,
  type AboutYouDraft,
  type AreaDraft,
  type ServiceAreaAvailabilityDraft,
  type ServiceDraft,
  type SkillsServicesDraft,
} from "@/components/provider/onboarding/types";
import { WizardProgress } from "@/components/provider/onboarding/WizardProgress";
import { StepAboutYou } from "@/components/provider/onboarding/StepAboutYou";
import { StepSkillsServices } from "@/components/provider/onboarding/StepSkillsServices";
import { StepServiceArea } from "@/components/provider/onboarding/StepServiceArea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

type Phase = "loading" | "wizard" | "already-complete" | "load-error" | "finished";

export function OnboardingWizard() {
  const router = useRouter();
  const { provider, status: providerStatus, error: providerError } = useProvider(true);

  const [phase, setPhase] = useState<Phase>("loading");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subResourceError, setSubResourceError] = useState<string | null>(null);

  const [aboutYou, setAboutYou] = useState<AboutYouDraft>(emptyAboutYou());
  const [skillsServices, setSkillsServices] = useState<SkillsServicesDraft>(emptySkillsServices());
  const [serviceArea, setServiceArea] = useState<ServiceAreaAvailabilityDraft>(emptyServiceAreaAvailability());

  const hasExistingProvider = useRef(false);
  const initialOfferingIds = useRef<Set<string>>(new Set());
  const initialAreaIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const loadSubResourcesAndResume = useCallback(async () => {
    setSubResourceError(null);
    try {
      const [mySkills, myServices, myAreas, myWeekly] = await Promise.all([
        listMySkills(),
        listMyServices(),
        listMyServiceAreas(),
        listMyWeeklyAvailability(),
      ]);

      const services: ServiceDraft[] = myServices.data.map((offering) => ({
        serviceId: offering.serviceId,
        offeringId: offering.id,
        priceAmount: offering.priceAmount ?? "",
        priceCurrency: offering.priceCurrency ?? "USD",
        experienceYears: offering.experienceYears != null ? String(offering.experienceYears) : "",
        notes: offering.notes ?? "",
      }));
      setSkillsServices({ skills: mySkills.data, services });
      initialOfferingIds.current = new Set(myServices.data.map((s) => s.id));

      const areas: AreaDraft[] = myAreas.data.map((area) => ({
        id: area.id,
        tempId: area.id,
        countryCode: area.countryCode,
        region: area.region ?? "",
        city: area.city,
        postalCode: area.postalCode ?? "",
        latitude: area.latitude != null ? String(area.latitude) : "",
        longitude: area.longitude != null ? String(area.longitude) : "",
        radiusKm: area.radiusKm != null ? String(area.radiusKm) : "",
      }));
      initialAreaIds.current = new Set(myAreas.data.map((a) => a.id));

      const weekly = emptyServiceAreaAvailability().weekly;
      for (const slot of myWeekly.data) {
        weekly[slot.dayOfWeek] = { enabled: true, startTime: slot.startTime, endTime: slot.endTime };
      }
      setServiceArea({ areas, weekly });

      if (myServices.data.length === 0) {
        setStep(2);
        setPhase("wizard");
      } else if (myAreas.data.length === 0 || myWeekly.data.length === 0) {
        setStep(3);
        setPhase("wizard");
      } else {
        setPhase("already-complete");
      }
    } catch {
      setSubResourceError("Couldn't load your progress so far. Please try again.");
      setPhase("load-error");
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    if (providerStatus === "loading") return;

    queueMicrotask(() => {
      if (providerStatus === "error") {
        initialized.current = true;
        setSubResourceError(providerError?.message ?? "Couldn't load your provider profile.");
        setPhase("load-error");
        return;
      }

      if (providerStatus === "not-onboarded") {
        initialized.current = true;
        setPhase("wizard");
        setStep(1);
        return;
      }

      if (providerStatus === "ready" && provider) {
        initialized.current = true;
        hasExistingProvider.current = true;
        setAboutYou({
          displayName: provider.displayName,
          bio: provider.bio ?? "",
          businessName: provider.businessName ?? "",
          yearsExperience: provider.yearsExperience != null ? String(provider.yearsExperience) : "",
          languages: provider.languages,
          timezone: provider.timezone,
          photoUrl: provider.profilePhotoUrl ?? "",
        });

        void loadSubResourcesAndResume();
      }
    });
  }, [providerStatus, provider, providerError, loadSubResourcesAndResume]);

  async function persistAboutYou() {
    const raw = {
      displayName: aboutYou.displayName,
      bio: aboutYou.bio.trim() || undefined,
      profilePhotoUrl: aboutYou.photoUrl || undefined,
      yearsExperience: aboutYou.yearsExperience.trim() === "" ? undefined : aboutYou.yearsExperience,
      businessName: aboutYou.businessName.trim() || undefined,
      languages: aboutYou.languages,
      timezone: aboutYou.timezone.trim() || undefined,
    };

    if (hasExistingProvider.current) {
      const parsed = updateProviderSchema.parse(raw);
      await updateMyProvider(omitEmptyOptionals(parsed));
    } else {
      const parsed = createProviderSchema.parse(raw);
      await createMyProvider(omitEmptyOptionals(parsed) as CreateProviderInput);
      hasExistingProvider.current = true;
    }
    setStep(2);
  }

  async function persistSkillsServices() {
    await replaceMySkills(skillsServices.skills.map((s) => s.id));

    const currentOfferingIds = new Set(
      skillsServices.services.map((s) => s.offeringId).filter((id): id is string => Boolean(id)),
    );
    for (const id of initialOfferingIds.current) {
      if (!currentOfferingIds.has(id)) await deleteMyService(id);
    }

    const updated: ServiceDraft[] = [];
    for (const draft of skillsServices.services) {
      const patch = {
        priceAmount: draft.priceAmount.trim() === "" ? null : Number(draft.priceAmount),
        priceCurrency: draft.priceAmount.trim() === "" ? null : draft.priceCurrency.trim().toUpperCase(),
        experienceYears: draft.experienceYears.trim() === "" ? null : Number(draft.experienceYears),
        notes: draft.notes.trim() || null,
      };
      if (draft.offeringId) {
        await updateMyService(draft.offeringId, patch);
        updated.push(draft);
      } else {
        const created = await createMyService({ serviceId: draft.serviceId, ...patch });
        updated.push({ ...draft, offeringId: created.id });
      }
    }
    setSkillsServices((prev) => ({ ...prev, services: updated }));
    initialOfferingIds.current = new Set(updated.map((d) => d.offeringId).filter((id): id is string => Boolean(id)));
    setStep(3);
  }

  async function persistServiceAreaAvailability() {
    const currentAreaIds = new Set(serviceArea.areas.map((a) => a.id).filter((id): id is string => Boolean(id)));
    for (const id of initialAreaIds.current) {
      if (!currentAreaIds.has(id)) await deleteMyServiceArea(id);
    }
    for (const area of serviceArea.areas) {
      if (area.id) continue; // already persisted; servora-provider has no update endpoint for an existing area
      await createMyServiceArea({
        countryCode: area.countryCode,
        region: area.region.trim() || undefined,
        city: area.city,
        postalCode: area.postalCode.trim() || undefined,
        latitude: area.latitude.trim() !== "" ? Number(area.latitude) : undefined,
        longitude: area.longitude.trim() !== "" ? Number(area.longitude) : undefined,
        radiusKm: area.radiusKm.trim() !== "" ? Number(area.radiusKm) : undefined,
      });
    }

    const slots = serviceArea.weekly
      .map((slot, dayOfWeek) => (slot.enabled ? { dayOfWeek, startTime: slot.startTime, endTime: slot.endTime } : null))
      .filter((slot): slot is { dayOfWeek: number; startTime: string; endTime: string } => slot !== null);
    await replaceMyWeeklyAvailability(slots);

    setPhase("finished");
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (phase === "load-error") {
    return (
      <ErrorState
        description={subResourceError ?? "Couldn't load your provider profile."}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              initialized.current = false;
              setPhase("loading");
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  if (phase === "already-complete") {
    return (
      <Card className="flex flex-col items-start gap-3 p-8">
        <h1 className="font-display text-h3 text-ink-900">You&apos;re already set up</h1>
        <p className="text-sm text-text-secondary">
          {aboutYou.displayName} already has a complete provider profile. Head to your dashboard to
          manage it.
        </p>
        <Button href="/" variant="primary">
          Go to dashboard
        </Button>
      </Card>
    );
  }

  if (phase === "finished") {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-500">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-h3 text-ink-900">You&apos;re all set!</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Your provider profile, services, area, and availability are saved. You can fine-tune any
            of it, and submit for verification, from your dashboard.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push("/")}>
          Go to dashboard
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <WizardProgress currentStep={step} />
      {step === 1 ? <StepAboutYou value={aboutYou} onChange={setAboutYou} onContinue={persistAboutYou} /> : null}
      {step === 2 ? (
        <StepSkillsServices
          value={skillsServices}
          onChange={setSkillsServices}
          onContinue={persistSkillsServices}
          onBack={() => setStep(1)}
        />
      ) : null}
      {step === 3 ? (
        <StepServiceArea
          value={serviceArea}
          onChange={setServiceArea}
          onFinish={persistServiceAreaAvailability}
          onBack={() => setStep(2)}
        />
      ) : null}
    </div>
  );
}
