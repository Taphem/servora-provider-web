import { ApiError, apiRequest } from "@/lib/api/client";
import type {
  AvailabilityDateOverride,
  AvailabilityDateOverrideInput,
  CreateProviderInput,
  CreateProviderServiceInput,
  CreateServiceAreaInput,
  Page,
  ProfilePhotoUploadSignature,
  Provider,
  ProviderService,
  ServiceArea,
  Skill,
  UpdateProviderInput,
  UpdateProviderServiceInput,
  WeeklyAvailabilitySlot,
  WeeklyAvailabilitySlotInput,
} from "@/types/domain";

/**
 * Typed wrappers for servora-provider's self-service ("/me") contract,
 * reached through the API Gateway at /api/v1/providers/*. Verified against
 * servora-provider's actual route/schema source — every self-service route
 * requires a BUSINESS_OWNER identity and is always scoped server-side to
 * the caller's own provider record; no id/slug is ever passed from this
 * client to a /me endpoint.
 */

// ---- Profile & lifecycle ---------------------------------------------------

/** Throws ApiError with status 404 if the authenticated user has no provider record yet (hasn't started onboarding). */
export function getMyProvider(): Promise<Provider> {
  return apiRequest<Provider>("/api/v1/providers/me");
}

export function createMyProvider(input: CreateProviderInput): Promise<Provider> {
  return apiRequest<Provider>("/api/v1/providers/me", { method: "POST", body: input });
}

export function updateMyProvider(input: UpdateProviderInput): Promise<Provider> {
  return apiRequest<Provider>("/api/v1/providers/me", { method: "PATCH", body: input });
}

const PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export function validateProfilePhoto(file: File): string | null {
  if (!PROFILE_PHOTO_TYPES.has(file.type)) return 'Choose a JPG, JPEG, PNG, or WebP image.';
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return 'Choose an image smaller than 5 MB.';
  return null;
}

/** Direct upload using a short-lived signature. Cloudinary's API secret never enters the browser. */
export async function uploadMyProfilePhoto(file: File): Promise<string> {
  const validationError = validateProfilePhoto(file);
  if (validationError) throw new ApiError('CLIENT_INVALID_PROFILE_PHOTO', validationError, 400);

  const signed = await apiRequest<ProfilePhotoUploadSignature>('/api/v1/providers/me/profile-photo-upload', { method: 'POST' });
  const form = new FormData();
  form.set('file', file);
  form.set('api_key', signed.apiKey);
  form.set('timestamp', String(signed.timestamp));
  form.set('signature', signed.signature);
  form.set('public_id', signed.publicId);
  form.set('upload_preset', signed.uploadPreset);
  form.set('allowed_formats', signed.allowedFormats.join(','));

  let response: Response;
  try {
    response = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new ApiError('CLIENT_PROFILE_PHOTO_UPLOAD_FAILED', "Couldn't upload your profile photo. Please try again.", 0);
  }
  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: unknown; public_id?: unknown; error?: { message?: unknown } }
    | null;
  if (!response.ok || typeof payload?.secure_url !== 'string' || payload.public_id !== signed.publicId) {
    // Cloudinary's own error envelope is { error: { message } } — e.g. "Invalid
    // cloud_name", "Upload preset not found", "Invalid Signature". Surfacing it
    // (rather than a generic message) is what tells you whether the
    // CLOUDINARY_* Render env vars are wrong, and exactly which one.
    const cloudinaryMessage = typeof payload?.error?.message === 'string' ? payload.error.message : undefined;
    throw new ApiError(
      'CLIENT_PROFILE_PHOTO_UPLOAD_FAILED',
      cloudinaryMessage
        ? `Couldn't upload your profile photo: ${cloudinaryMessage}`
        : "Couldn't upload your profile photo. Please try again.",
      response.status,
    );
  }
  return payload.secure_url;
}

/** PENDING_ONBOARDING or PAUSED -> ACTIVE. */
export function activateMyProvider(): Promise<Provider> {
  return apiRequest<Provider>("/api/v1/providers/me/activate", { method: "POST" });
}

/** ACTIVE -> PAUSED. */
export function pauseMyProvider(): Promise<Provider> {
  return apiRequest<Provider>("/api/v1/providers/me/pause", { method: "POST" });
}

/** UNVERIFIED or REJECTED -> PENDING_REVIEW. */
export function submitMyVerification(): Promise<Provider> {
  return apiRequest<Provider>("/api/v1/providers/me/verification/submit", { method: "POST" });
}

// ---- Skills -----------------------------------------------------------------

/** Public read-only skills catalog (no auth required), used to build a picker. */
export function listSkillsCatalog(params?: { page?: number; pageSize?: number }): Promise<Page<Skill>> {
  return apiRequest<Page<Skill>>("/api/v1/providers/skills", { query: params });
}

export function listMySkills(): Promise<{ data: Skill[] }> {
  return apiRequest<{ data: Skill[] }>("/api/v1/providers/me/skills");
}

/**
 * Creates a provider-defined skill (e.g. "Split AC servicing") that has no
 * corresponding entry in the Services catalog — or, if another provider
 * already created a skill with the same name, returns that existing one.
 * Does not associate it with the caller by itself; pass its id in the next
 * replaceMySkills call.
 */
export function createMySkill(name: string): Promise<Skill> {
  return apiRequest<Skill>("/api/v1/providers/me/skills", { method: "POST", body: { name } });
}

/** Atomic replace — sends the caller's full desired skill-id set. */
export function replaceMySkills(skillIds: string[]): Promise<{ data: Skill[] }> {
  return apiRequest<{ data: Skill[] }>("/api/v1/providers/me/skills", { method: "PUT", body: { skillIds } });
}

// ---- Provider-owned services & pricing --------------------------------------

export function listMyServices(): Promise<{ data: ProviderService[] }> {
  return apiRequest<{ data: ProviderService[] }>("/api/v1/providers/me/services");
}

export function createMyService(input: CreateProviderServiceInput): Promise<ProviderService> {
  return apiRequest<ProviderService>("/api/v1/providers/me/services", { method: "POST", body: input });
}

export function updateMyService(serviceOfferingId: string, input: UpdateProviderServiceInput): Promise<ProviderService> {
  return apiRequest<ProviderService>(`/api/v1/providers/me/services/${serviceOfferingId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteMyService(serviceOfferingId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/providers/me/services/${serviceOfferingId}`, { method: "DELETE" });
}

// ---- Service areas ------------------------------------------------------------

export function listMyServiceAreas(): Promise<{ data: ServiceArea[] }> {
  return apiRequest<{ data: ServiceArea[] }>("/api/v1/providers/me/service-areas");
}

export function createMyServiceArea(input: CreateServiceAreaInput): Promise<ServiceArea> {
  return apiRequest<ServiceArea>("/api/v1/providers/me/service-areas", { method: "POST", body: input });
}

export function deleteMyServiceArea(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/providers/me/service-areas/${id}`, { method: "DELETE" });
}

// ---- Availability ---------------------------------------------------------------

export function listMyWeeklyAvailability(): Promise<{ data: WeeklyAvailabilitySlot[] }> {
  return apiRequest<{ data: WeeklyAvailabilitySlot[] }>("/api/v1/providers/me/availability/weekly");
}

/** Atomic replace — sends the caller's full desired weekly schedule. */
export function replaceMyWeeklyAvailability(
  slots: WeeklyAvailabilitySlotInput[],
): Promise<{ data: WeeklyAvailabilitySlot[] }> {
  return apiRequest<{ data: WeeklyAvailabilitySlot[] }>("/api/v1/providers/me/availability/weekly", {
    method: "PUT",
    body: { slots },
  });
}

export function listMyAvailabilityOverrides(params: { from: string; to: string }): Promise<{
  data: AvailabilityDateOverride[];
}> {
  return apiRequest<{ data: AvailabilityDateOverride[] }>("/api/v1/providers/me/availability/overrides", {
    query: params,
  });
}

/** date is an ISO date string (YYYY-MM-DD), used as the path key (upsert). */
export function upsertMyAvailabilityOverride(
  date: string,
  input: AvailabilityDateOverrideInput,
): Promise<AvailabilityDateOverride> {
  return apiRequest<AvailabilityDateOverride>(`/api/v1/providers/me/availability/overrides/${date}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteMyAvailabilityOverride(date: string): Promise<void> {
  return apiRequest<void>(`/api/v1/providers/me/availability/overrides/${date}`, { method: "DELETE" });
}
