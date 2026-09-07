import type { Skill } from "@/types/domain";

/** Wizard-local draft state for each step. Kept as strings for form inputs; parsed/validated only when a step's Continue is pressed. */

export interface AboutYouDraft {
  displayName: string;
  bio: string;
  businessName: string;
  yearsExperience: string;
  languages: string[];
  timezone: string;
  photoUrl: string;
  pendingPhotoFile?: File | null;
}

export interface ServiceDraft {
  serviceId: string;
  /** Set once this offering has actually been persisted (POST /me/services succeeded). */
  offeringId?: string;
  priceAmount: string;
  priceCurrency: string;
  experienceYears: string;
  notes: string;
}

export interface SkillsServicesDraft {
  /** Provider-defined expertise — independent of the Services catalog and independent of `services` below. */
  skills: Skill[];
  services: ServiceDraft[];
}

export interface AreaDraft {
  /** Set once this area has actually been persisted (POST /me/service-areas succeeded). */
  id?: string;
  /** Stable client-side key for list rendering/removal before persistence. */
  tempId: string;
  countryCode: string;
  region: string;
  city: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
  /** User-facing display address resolved from Google Places or Geocoding. */
  formattedAddress?: string;
  /** Google Place ID if selected from Place autocomplete. */
  placeId?: string;
}

export interface DaySlotDraft {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface ServiceAreaAvailabilityDraft {
  areas: AreaDraft[];
  /** Index 0 = Sunday .. 6 = Saturday, matching servora-provider's day_of_week convention. */
  weekly: DaySlotDraft[];
}

export function emptyAboutYou(): AboutYouDraft {
  return {
    displayName: "",
    bio: "",
    businessName: "",
    yearsExperience: "",
    languages: [],
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    photoUrl: "",
  };
}

export function emptySkillsServices(): SkillsServicesDraft {
  return { skills: [], services: [] };
}

export function emptyServiceAreaAvailability(): ServiceAreaAvailabilityDraft {
  return {
    areas: [],
    weekly: Array.from({ length: 7 }, () => ({ enabled: false, startTime: "09:00", endTime: "17:00" })),
  };
}
