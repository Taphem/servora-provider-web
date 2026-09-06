import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepSkillsServices } from "@/components/provider/onboarding/StepSkillsServices";
import { emptySkillsServices } from "@/components/provider/onboarding/types";
import type { CatalogService, Category, Skill } from "@/types/domain";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, listSkillsCatalog: vi.fn() };
});
vi.mock("@/lib/api/services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/services")>();
  return { ...actual, listCatalogServices: vi.fn(), listCategories: vi.fn(), getServiceRequirements: vi.fn() };
});

const providerApi = await import("@/lib/api/provider");
const servicesApi = await import("@/lib/api/services");
const mockedListSkillsCatalog = vi.mocked(providerApi.listSkillsCatalog);
const mockedListCatalogServices = vi.mocked(servicesApi.listCatalogServices);
const mockedListCategories = vi.mocked(servicesApi.listCategories);
const mockedGetServiceRequirements = vi.mocked(servicesApi.getServiceRequirements);

const cleaningCategoryId = "11111111-1111-4111-8111-000000000001";
const autoCategoryId = "11111111-1111-4111-8111-000000000002";
const deepCleaningId = "22222222-2222-4222-8222-000000000001";
const carWashId = "22222222-2222-4222-8222-000000000002";

const categories: Category[] = [
  { id: cleaningCategoryId, parentId: null, name: "Cleaning", slug: "cleaning", description: null, displayOrder: 0, status: "ACTIVE", createdAt: "", updatedAt: "" },
  { id: autoCategoryId, parentId: null, name: "Auto", slug: "auto", description: null, displayOrder: 1, status: "ACTIVE", createdAt: "", updatedAt: "" },
];
const services: CatalogService[] = [
  {
    id: deepCleaningId,
    categoryId: cleaningCategoryId,
    name: "Home Deep Cleaning",
    slug: "home-deep-cleaning",
    description: "Full-home deep clean",
    status: "ACTIVE",
    bookingMode: "INSTANT_ACCEPT",
    pricingModel: "FIXED",
    basePriceAmount: "80.00",
    basePriceCurrency: "USD",
    displayOrder: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: carWashId,
    categoryId: autoCategoryId,
    name: "Car Wash & Detailing",
    slug: "car-wash-detailing",
    description: null,
    status: "ACTIVE",
    bookingMode: "PROVIDER_SELECTION",
    pricingModel: "FIXED",
    basePriceAmount: null,
    basePriceCurrency: null,
    displayOrder: 0,
    createdAt: "",
    updatedAt: "",
  },
];
const skills: Skill[] = [{ id: "s1", name: "Deep cleaning", slug: "deep-cleaning", status: "ACTIVE", createdAt: "", updatedAt: "" }];

function setup() {
  mockedListSkillsCatalog.mockResolvedValue({ data: skills, pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } });
  mockedListCategories.mockResolvedValue({ data: categories, pagination: { page: 1, pageSize: 100, total: 2, totalPages: 1 } });
  mockedListCatalogServices.mockResolvedValue({ data: services, pagination: { page: 1, pageSize: 100, total: 2, totalPages: 1 } });
  mockedGetServiceRequirements.mockResolvedValue({ fields: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StepSkillsServices", () => {
  it("groups catalog services under their real category headers", async () => {
    setup();
    render(<StepSkillsServices value={emptySkillsServices()} onChange={vi.fn()} onContinue={vi.fn()} onBack={vi.fn()} />);

    expect(await screen.findByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText("Home Deep Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Car Wash & Detailing")).toBeInTheDocument();
  });

  it("selecting a service reveals its pricing fields and a read-only requirements preview", async () => {
    setup();
    mockedGetServiceRequirements.mockResolvedValue({
      fields: [
        {
          id: "f1",
          serviceId: deepCleaningId,
          key: "rooms",
          label: "Number of rooms",
          fieldType: "NUMBER",
          isRequired: true,
          displayOrder: 0,
          placeholder: null,
          helpText: null,
          minLength: null,
          maxLength: null,
          minValue: null,
          maxValue: null,
          minSelections: null,
          maxSelections: null,
          options: [],
        },
      ],
    });
    const onChange = vi.fn();
    render(<StepSkillsServices value={emptySkillsServices()} onChange={onChange} onContinue={vi.fn()} onBack={vi.fn()} />);

    const user = userEvent.setup();
    await screen.findByText("Home Deep Cleaning");
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ services: [expect.objectContaining({ serviceId: deepCleaningId })] }),
    );
  });

  it("renders the requirements preview fetched from the real catalog endpoint for a selected service", async () => {
    setup();
    mockedGetServiceRequirements.mockResolvedValue({
      fields: [
        {
          id: "f1",
          serviceId: deepCleaningId,
          key: "rooms",
          label: "Number of rooms",
          fieldType: "NUMBER",
          isRequired: true,
          displayOrder: 0,
          placeholder: null,
          helpText: null,
          minLength: null,
          maxLength: null,
          minValue: null,
          maxValue: null,
          minSelections: null,
          maxSelections: null,
          options: [],
        },
      ],
    });
    const value = { skillIds: [], services: [{ serviceId: deepCleaningId, priceAmount: "", priceCurrency: "USD", experienceYears: "", notes: "" }] };
    render(<StepSkillsServices value={value} onChange={vi.fn()} onContinue={vi.fn()} onBack={vi.fn()} />);

    expect(await screen.findByText("Customers booking this service will be asked for:")).toBeInTheDocument();
    expect(screen.getByText("Number of rooms")).toBeInTheDocument();
    expect(mockedGetServiceRequirements).toHaveBeenCalledWith("home-deep-cleaning");
  });

  it("shows an error state with retry when the catalog fails to load", async () => {
    setup();
    mockedListCatalogServices.mockRejectedValueOnce(new Error("down"));

    const user = userEvent.setup();
    render(<StepSkillsServices value={emptySkillsServices()} onChange={vi.fn()} onContinue={vi.fn()} onBack={vi.fn()} />);

    expect(await screen.findByText("Couldn't load the services catalog.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Home Deep Cleaning")).toBeInTheDocument();
  });
});
