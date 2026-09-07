import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingWizard } from "@/components/provider/onboarding/OnboardingWizard";
import { ApiError } from "@/lib/api/client";
import type { CatalogService, Category, Provider, ProviderService, ServiceArea, Skill, WeeklyAvailabilitySlot } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return {
    ...actual,
    getMyProvider: vi.fn(),
    createMyProvider: vi.fn(),
    updateMyProvider: vi.fn(),
    listMySkills: vi.fn(),
    listMyServices: vi.fn(),
    listMyServiceAreas: vi.fn(),
    listMyWeeklyAvailability: vi.fn(),
    replaceMySkills: vi.fn(),
    createMyService: vi.fn(),
    updateMyService: vi.fn(),
    deleteMyService: vi.fn(),
    createMyServiceArea: vi.fn(),
    deleteMyServiceArea: vi.fn(),
    replaceMyWeeklyAvailability: vi.fn(),
    listSkillsCatalog: vi.fn(),
  };
});
vi.mock("@/lib/api/services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/services")>();
  return { ...actual, listCatalogServices: vi.fn(), listCategories: vi.fn(), getServiceRequirements: vi.fn() };
});

const providerApi = await import("@/lib/api/provider");
const servicesApi = await import("@/lib/api/services");

const m = {
  getMyProvider: vi.mocked(providerApi.getMyProvider),
  createMyProvider: vi.mocked(providerApi.createMyProvider),
  updateMyProvider: vi.mocked(providerApi.updateMyProvider),
  listMySkills: vi.mocked(providerApi.listMySkills),
  listMyServices: vi.mocked(providerApi.listMyServices),
  listMyServiceAreas: vi.mocked(providerApi.listMyServiceAreas),
  listMyWeeklyAvailability: vi.mocked(providerApi.listMyWeeklyAvailability),
  replaceMySkills: vi.mocked(providerApi.replaceMySkills),
  createMyService: vi.mocked(providerApi.createMyService),
  updateMyService: vi.mocked(providerApi.updateMyService),
  deleteMyService: vi.mocked(providerApi.deleteMyService),
  createMyServiceArea: vi.mocked(providerApi.createMyServiceArea),
  deleteMyServiceArea: vi.mocked(providerApi.deleteMyServiceArea),
  replaceMyWeeklyAvailability: vi.mocked(providerApi.replaceMyWeeklyAvailability),
  listSkillsCatalog: vi.mocked(providerApi.listSkillsCatalog),
  listCatalogServices: vi.mocked(servicesApi.listCatalogServices),
  listCategories: vi.mocked(servicesApi.listCategories),
  getServiceRequirements: vi.mocked(servicesApi.getServiceRequirements),
};

const CLEANING_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";

const catalogService: CatalogService = {
  id: CLEANING_ID,
  categoryId: CATEGORY_ID,
  name: "Home Deep Cleaning",
  slug: "home-deep-cleaning",
  description: null,
  status: "ACTIVE",
  bookingMode: "INSTANT_ACCEPT",
  pricingModel: "FIXED",
  basePriceAmount: "49.99",
  basePriceCurrency: "USD",
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const category: Category = {
  id: CATEGORY_ID,
  parentId: null,
  name: "Cleaning",
  slug: "cleaning",
  description: null,
  displayOrder: 0,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function emptyLists() {
  m.listSkillsCatalog.mockResolvedValue({ data: [] as Skill[], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } });
  m.listCategories.mockResolvedValue({ data: [category], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } });
  m.listCatalogServices.mockResolvedValue({ data: [catalogService], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } });
  m.getServiceRequirements.mockResolvedValue({ fields: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
  emptyLists();
});

describe("OnboardingWizard — new provider", () => {
  beforeEach(() => {
    m.getMyProvider.mockRejectedValue(new ApiError("PROVIDER_NOT_FOUND", "Not found", 404));
  });

  it("starts at step 1 for a BUSINESS_OWNER with no provider record yet", async () => {
    render(<OnboardingWizard />);
    expect(await screen.findByText("Tell customers about yourself")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3 — About you")).toBeInTheDocument();
  });

  it("advances 1 -> 2 -> 3, persisting each step for real, and retains data going back", async () => {
    const user = userEvent.setup();
    m.createMyProvider.mockResolvedValue({ id: "p1", displayName: "Asha" } as Provider);
    m.replaceMySkills.mockResolvedValue({ data: [] });
    m.createMyService.mockResolvedValue({ id: "off-1", serviceId: CLEANING_ID } as ProviderService);

    render(<OnboardingWizard />);
    await screen.findByText("Tell customers about yourself");

    await user.type(screen.getByLabelText("Display name"), "Asha Cleaner");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(m.createMyProvider).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Asha Cleaner" })));
    expect(await screen.findByText("Build your professional offering")).toBeInTheDocument();

    // Going back retains what was typed in step 1.
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByDisplayValue("Asha Cleaner")).toBeInTheDocument();

    // Forward again into step 2, select a service, and continue.
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Build your professional offering");
    await user.click(screen.getByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(m.replaceMySkills).toHaveBeenCalledWith([]));
    await waitFor(() => expect(m.createMyService).toHaveBeenCalledWith(expect.objectContaining({ serviceId: CLEANING_ID })));
    expect(await screen.findByText("Where and when can customers book you?")).toBeInTheDocument();
  });

  it("refuses to continue past step 2 with no service selected", async () => {
    const user = userEvent.setup();
    m.createMyProvider.mockResolvedValue({ id: "p1", displayName: "Asha" } as Provider);

    render(<OnboardingWizard />);
    await user.type(await screen.findByLabelText("Display name"), "Asha Cleaner");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Build your professional offering");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Search for and select at least one service you're qualified to provide.")).toBeInTheDocument();
    expect(m.createMyService).not.toHaveBeenCalled();
  });

  it("finishes onboarding by persisting the service area and weekly availability", async () => {
    const user = userEvent.setup();
    m.createMyProvider.mockResolvedValue({ id: "p1", displayName: "Asha" } as Provider);
    m.replaceMySkills.mockResolvedValue({ data: [] });
    m.createMyService.mockResolvedValue({ id: "off-1", serviceId: CLEANING_ID } as ProviderService);
    m.createMyServiceArea.mockResolvedValue({ id: "area-1" } as ServiceArea);
    m.replaceMyWeeklyAvailability.mockResolvedValue({ data: [] });

    render(<OnboardingWizard />);
    await user.type(await screen.findByLabelText("Display name"), "Asha Cleaner");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Build your professional offering");
    await user.click(screen.getByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Where and when can customers book you?");

    await user.type(screen.getByLabelText("City"), "Austin");
    await user.click(screen.getByRole("button", { name: "Add area" }));
    await user.click(screen.getByRole("switch", { name: "Monday availability" }));

    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    await waitFor(() =>
      expect(m.createMyServiceArea).toHaveBeenCalledWith(expect.objectContaining({ city: "Austin" })),
    );
    await waitFor(() =>
      expect(m.replaceMyWeeklyAvailability).toHaveBeenCalledWith([
        expect.objectContaining({ dayOfWeek: 1 }),
      ]),
    );
    expect(await screen.findByText("You're all set!")).toBeInTheDocument();
  });

  it("refuses to finish with no area or no available day", async () => {
    const user = userEvent.setup();
    m.createMyProvider.mockResolvedValue({ id: "p1", displayName: "Asha" } as Provider);
    m.replaceMySkills.mockResolvedValue({ data: [] });
    m.createMyService.mockResolvedValue({ id: "off-1", serviceId: CLEANING_ID } as ProviderService);

    render(<OnboardingWizard />);
    await user.type(await screen.findByLabelText("Display name"), "Asha Cleaner");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Build your professional offering");
    await user.click(screen.getByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Where and when can customers book you?");

    await user.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(await screen.findByText("Add at least one area you serve.")).toBeInTheDocument();
    expect(m.replaceMyWeeklyAvailability).not.toHaveBeenCalled();
  });
});

describe("OnboardingWizard — resuming an existing provider", () => {
  const provider: Provider = {
    id: "p1",
    userId: "u1",
    displayName: "Asha Cleaner",
    slug: "asha-cleaner",
    bio: null,
    profilePhotoUrl: null,
    yearsExperience: 3,
    businessName: null,
    languages: ["en"],
    timezone: "UTC",
    status: "PENDING_ONBOARDING",
    verificationStatus: "UNVERIFIED",
    verificationNotes: null,
    disabledReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    m.getMyProvider.mockResolvedValue(provider);
    m.listMySkills.mockResolvedValue({ data: [] });
  });

  it("resumes at step 2 when the profile exists but no service has been added yet", async () => {
    m.listMyServices.mockResolvedValue({ data: [] });
    m.listMyServiceAreas.mockResolvedValue({ data: [] });
    m.listMyWeeklyAvailability.mockResolvedValue({ data: [] });

    render(<OnboardingWizard />);
    expect(await screen.findByText("Build your professional offering")).toBeInTheDocument();
  });

  it("resumes at step 3 when services exist but no service area does", async () => {
    m.listMyServices.mockResolvedValue({
      data: [{ id: "off-1", providerId: "p1", serviceId: CLEANING_ID, isEnabled: true, priceAmount: null, priceCurrency: null, experienceYears: null, notes: null, createdAt: "", updatedAt: "" } satisfies ProviderService],
    });
    m.listMyServiceAreas.mockResolvedValue({ data: [] });
    m.listMyWeeklyAvailability.mockResolvedValue({ data: [] });

    render(<OnboardingWizard />);
    expect(await screen.findByText("Where and when can customers book you?")).toBeInTheDocument();
  });

  it("shows an already-complete state once profile, services, area, and availability all exist", async () => {
    m.listMyServices.mockResolvedValue({
      data: [{ id: "off-1", providerId: "p1", serviceId: CLEANING_ID, isEnabled: true, priceAmount: null, priceCurrency: null, experienceYears: null, notes: null, createdAt: "", updatedAt: "" } satisfies ProviderService],
    });
    m.listMyServiceAreas.mockResolvedValue({
      data: [{ id: "area-1", providerId: "p1", countryCode: "US", region: null, city: "Austin", postalCode: null, latitude: null, longitude: null, radiusKm: null, createdAt: "" } satisfies ServiceArea],
    });
    m.listMyWeeklyAvailability.mockResolvedValue({
      data: [{ id: "slot-1", providerId: "p1", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", createdAt: "" } satisfies WeeklyAvailabilitySlot],
    });

    render(<OnboardingWizard />);
    expect(await screen.findByText("You're already set up")).toBeInTheDocument();
  });

  it("shows a retry action if loading saved progress fails", async () => {
    m.listMyServices.mockRejectedValue(new Error("network down"));

    render(<OnboardingWizard />);
    expect(await screen.findByText("Couldn't load your progress so far. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
