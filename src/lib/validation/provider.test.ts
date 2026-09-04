import { describe, it, expect } from "vitest";
import {
  createProviderSchema,
  createProviderServiceSchema,
  createServiceAreaSchema,
  weeklySlotSchema,
  availabilityOverrideSchema,
} from "@/lib/validation/provider";

describe("createProviderSchema", () => {
  it("accepts a minimal valid submission", () => {
    const result = createProviderSchema.safeParse({ displayName: "Jordan Lee" });
    expect(result.success).toBe(true);
  });

  it("rejects a display name that's too short", () => {
    const result = createProviderSchema.safeParse({ displayName: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with uppercase or invalid characters", () => {
    const result = createProviderSchema.safeParse({ displayName: "Jordan Lee", slug: "Not Valid!" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid IANA time zone", () => {
    const result = createProviderSchema.safeParse({ displayName: "Jordan Lee", timezone: "Not/AZone" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid IANA time zone", () => {
    const result = createProviderSchema.safeParse({
      displayName: "Jordan Lee",
      timezone: "America/New_York",
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 20 languages", () => {
    const result = createProviderSchema.safeParse({
      displayName: "Jordan Lee",
      languages: Array.from({ length: 21 }, () => "en"),
    });
    expect(result.success).toBe(false);
  });
});

describe("createProviderServiceSchema", () => {
  it("accepts a service id with no price set", () => {
    const result = createProviderServiceSchema.safeParse({ serviceId: crypto.randomUUID() });
    expect(result.success).toBe(true);
  });

  it("rejects a price without a currency", () => {
    const result = createProviderServiceSchema.safeParse({
      serviceId: crypto.randomUUID(),
      priceAmount: 49.99,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a currency without a price", () => {
    const result = createProviderServiceSchema.safeParse({
      serviceId: crypto.randomUUID(),
      priceCurrency: "USD",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a price with a matching currency", () => {
    const result = createProviderServiceSchema.safeParse({
      serviceId: crypto.randomUUID(),
      priceAmount: 49.99,
      priceCurrency: "usd",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priceCurrency).toBe("USD");
  });

  it("rejects a negative price", () => {
    const result = createProviderServiceSchema.safeParse({
      serviceId: crypto.randomUUID(),
      priceAmount: -5,
      priceCurrency: "USD",
    });
    expect(result.success).toBe(false);
  });
});

describe("createServiceAreaSchema", () => {
  it("accepts a city with no coordinates", () => {
    const result = createServiceAreaSchema.safeParse({ countryCode: "US", city: "Austin" });
    expect(result.success).toBe(true);
  });

  it("rejects latitude set without longitude", () => {
    const result = createServiceAreaSchema.safeParse({
      countryCode: "US",
      city: "Austin",
      latitude: 30.27,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a radius without coordinates", () => {
    const result = createServiceAreaSchema.safeParse({
      countryCode: "US",
      city: "Austin",
      radiusKm: 10,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a radius with matching coordinates", () => {
    const result = createServiceAreaSchema.safeParse({
      countryCode: "US",
      city: "Austin",
      latitude: 30.27,
      longitude: -97.74,
      radiusKm: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("weeklySlotSchema", () => {
  it("accepts a valid slot", () => {
    const result = weeklySlotSchema.safeParse({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
    expect(result.success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = weeklySlotSchema.safeParse({ dayOfWeek: 1, startTime: "17:00", endTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a day of week outside 0-6", () => {
    const result = weeklySlotSchema.safeParse({ dayOfWeek: 7, startTime: "09:00", endTime: "17:00" });
    expect(result.success).toBe(false);
  });
});

describe("availabilityOverrideSchema", () => {
  it("accepts an unavailable override with no times", () => {
    const result = availabilityOverrideSchema.safeParse({ isUnavailable: true });
    expect(result.success).toBe(true);
  });

  it("rejects an unavailable override that also sets times", () => {
    const result = availabilityOverrideSchema.safeParse({
      isUnavailable: true,
      startTime: "09:00",
      endTime: "17:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a working override missing an end time", () => {
    const result = availabilityOverrideSchema.safeParse({ isUnavailable: false, startTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("accepts a working override with valid times", () => {
    const result = availabilityOverrideSchema.safeParse({
      isUnavailable: false,
      startTime: "09:00",
      endTime: "13:00",
    });
    expect(result.success).toBe(true);
  });
});
