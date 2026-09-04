/**
 * Types mirroring the real servora-provider, servora-auth, and
 * servora-services contracts, as verified by reading each service's actual
 * source (route handlers, zod schemas, SQL migrations) — not invented, not
 * from aspirational docs. See each service's README for the source of
 * truth this was checked against.
 */

// ---- servora-auth (shared identity) --------------------------------------

/** servora-auth's actual UserRole enum. There is no separate "PROVIDER" role — BUSINESS_OWNER is the role permitted to self-manage a provider profile. */
export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "BUSINESS_STAFF" | "ADMIN" | "SUPER_ADMIN" | "SUPPORT";

export function isProviderRole(role: UserRole): boolean {
  return role === "BUSINESS_OWNER";
}

export function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// ---- servora-provider ------------------------------------------------------

export type ProviderStatus = "PENDING_ONBOARDING" | "ACTIVE" | "PAUSED" | "DISABLED";

export type VerificationStatus = "UNVERIFIED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED";

/** GET/PATCH /api/v1/providers/me response shape (PrivateProviderDto). */
export interface Provider {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  yearsExperience: number | null;
  businessName: string | null;
  languages: string[];
  timezone: string;
  status: ProviderStatus;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  disabledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderInput {
  displayName: string;
  slug?: string;
  bio?: string;
  profilePhotoUrl?: string;
  yearsExperience?: number;
  businessName?: string;
  languages?: string[];
  timezone?: string;
}

export type UpdateProviderInput = Partial<CreateProviderInput>;

export type SkillStatus = "ACTIVE" | "INACTIVE";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  status: SkillStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderService {
  id: string;
  providerId: string;
  serviceId: string;
  isEnabled: boolean;
  priceAmount: string | null;
  priceCurrency: string | null;
  experienceYears: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderServiceInput {
  serviceId: string;
  isEnabled?: boolean;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  experienceYears?: number | null;
  notes?: string | null;
}

export type UpdateProviderServiceInput = Partial<Omit<CreateProviderServiceInput, "serviceId">>;

export interface ServiceArea {
  id: string;
  providerId: string;
  countryCode: string;
  region: string | null;
  city: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  createdAt: string;
}

export interface CreateServiceAreaInput {
  countryCode: string;
  region?: string;
  city: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/** day 0 = Sunday .. 6 = Saturday (JS Date#getDay convention, per servora-provider's schema). */
export interface WeeklyAvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface WeeklyAvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityDateOverride {
  id: string;
  providerId: string;
  overrideDate: string;
  isUnavailable: boolean;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityDateOverrideInput {
  isUnavailable: boolean;
  startTime?: string;
  endTime?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

// ---- servora-services (read-only catalog) ---------------------------------

export type CatalogServiceStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type BookingMode = "INSTANT_ACCEPT" | "PROVIDER_SELECTION" | "QUOTE";
export type PricingModel = "FIXED" | "HOURLY" | "QUOTE";

/**
 * A catalog service from servora-services. `basePriceAmount` is an
 * indicative "starting from" reference price only — never an authoritative
 * charge amount. The provider's own ProviderService.priceAmount is the
 * authoritative price for their offering; this catalog price must never be
 * copied into a provider's offering as if it were their price.
 */
export interface CatalogService {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  status: CatalogServiceStatus;
  bookingMode: BookingMode;
  pricingModel: PricingModel;
  basePriceAmount: string | null;
  basePriceCurrency: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}
