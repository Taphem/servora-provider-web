import { z } from "zod";

/**
 * Client-side mirrors of servora-provider's actual zod schemas
 * (src/schemas/*.ts in that repo). Kept in sync with the backend's real
 * validation rules so the form can fail fast with a helpful message
 * instead of a round trip to VALIDATION_FAILED — the backend remains the
 * source of truth and re-validates independently.
 */

const languageCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2}$/, "Use a 2-letter language code, e.g. en");

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const createProviderSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(150, "Keep it under 150 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(150)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().min(1).max(2000, "Keep your bio under 2000 characters").optional().or(z.literal("")),
  profilePhotoUrl: z.string().trim().url("Enter a valid URL").max(2048).optional().or(z.literal("")),
  yearsExperience: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, "Enter a number between 0 and 100")
    .optional(),
  businessName: z.string().trim().min(1).max(200).optional().or(z.literal("")),
  languages: z.array(languageCode).max(20, "You can list up to 20 languages").default([]),
  timezone: z
    .string()
    .trim()
    .default("UTC")
    .refine(isValidTimeZone, "Enter a valid time zone, e.g. America/New_York"),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;

export const updateProviderSchema = createProviderSchema.partial().extend({
  slug: createProviderSchema.shape.slug,
});

export const createProviderServiceSchema = z
  .object({
    serviceId: z.string().uuid("Choose a service from the catalog"),
    isEnabled: z.boolean().default(true),
    priceAmount: z.coerce
      .number()
      .finite()
      .nonnegative("Price can't be negative")
      .max(9_999_999_999.99)
      .nullable()
      .optional(),
    priceCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. USD")
      .nullable()
      .optional(),
    experienceYears: z.coerce.number().int().min(0).max(100).nullable().optional(),
    notes: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const hasAmount = val.priceAmount !== null && val.priceAmount !== undefined;
    const hasCurrency = val.priceCurrency !== null && val.priceCurrency !== undefined && val.priceCurrency !== "";
    if (hasAmount !== hasCurrency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set both a price and a currency, or leave both blank",
        path: ["priceAmount"],
      });
    }
  });

export type CreateProviderServiceFormValues = z.infer<typeof createProviderServiceSchema>;

export const createServiceAreaSchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use a 2-letter country code, e.g. US"),
    region: z.string().trim().min(1).max(150).optional().or(z.literal("")),
    city: z.string().trim().min(1, "City is required").max(150),
    postalCode: z.string().trim().min(1).max(20).optional().or(z.literal("")),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().gt(0).max(1000).optional(),
  })
  .superRefine((val, ctx) => {
    const hasLat = val.latitude !== undefined;
    const hasLng = val.longitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set both latitude and longitude, or leave both blank",
        path: ["latitude"],
      });
    }
    if (val.radiusKm !== undefined && !(hasLat && hasLng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A radius requires latitude and longitude to be set",
        path: ["radiusKm"],
      });
    }
  });

export type CreateServiceAreaFormValues = z.infer<typeof createServiceAreaSchema>;

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Use 24-hour HH:MM format");

export const weeklySlotSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((val) => val.startTime < val.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type WeeklySlotFormValues = z.infer<typeof weeklySlotSchema>;

export const availabilityOverrideSchema = z
  .object({
    isUnavailable: z.boolean().default(true),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.isUnavailable) {
      if (val.startTime || val.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Clear the times when marking a day fully unavailable",
          path: ["startTime"],
        });
      }
      return;
    }
    if (!val.startTime || !val.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set both a start and end time for a working override",
        path: ["startTime"],
      });
      return;
    }
    if (val.startTime >= val.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

export type AvailabilityOverrideFormValues = z.infer<typeof availabilityOverrideSchema>;
