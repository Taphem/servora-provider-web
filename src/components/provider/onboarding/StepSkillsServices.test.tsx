import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepSkillsServices } from "@/components/provider/onboarding/StepSkillsServices";
import { emptySkillsServices, type SkillsServicesDraft } from "@/components/provider/onboarding/types";
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

function Controlled({ initial = emptySkillsServices() }: { initial?: SkillsServicesDraft }) {
  const [value, setValue] = useState(initial);
  return <StepSkillsServices value={value} onChange={setValue} onContinue={vi.fn()} onBack={vi.fn()} />;
}

describe("StepSkillsServices — search-first service selection", () => {
  it("shows nothing until the search box is used, then groups matches under real category headers", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox");
    expect(screen.queryByText("Home Deep Cleaning")).not.toBeInTheDocument();

    await user.click(search);
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText("Home Deep Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Car Wash & Detailing")).toBeInTheDocument();
  });

  it("narrows results as the provider types, without exposing any service id", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox");
    await user.click(search);
    await user.type(search, "car wash");

    expect(screen.getByText("Car Wash & Detailing")).toBeInTheDocument();
    expect(screen.queryByText("Home Deep Cleaning")).not.toBeInTheDocument();
    expect(screen.queryByText(carWashId)).not.toBeInTheDocument();
  });

  it("selecting a service from search results adds it and opens its configuration panel", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox");
    await user.click(search);
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));

    expect(await screen.findByRole("button", { name: "Save service" })).toBeInTheDocument();
    expect(screen.getByLabelText("Selected services")).toHaveTextContent("Home Deep Cleaning");
  });

  it("supports adding a second service while keeping the first in the selected list", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Car Wash & Detailing" }));

    expect(screen.getByLabelText("Selected services")).toHaveTextContent("Home Deep Cleaning");
    expect(screen.getByLabelText("Selected services")).toHaveTextContent("Car Wash & Detailing");
  });

  it("moves a saved service into 'Your services' with its price, and lets you edit it again", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.type(screen.getByLabelText("Price amount"), "80");
    await user.click(screen.getByRole("button", { name: "Save service" }));

    expect(screen.getByText("Your services")).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "USD 80")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByLabelText("Price amount")).toHaveValue(80);
  });

  it("removes a service from the selected chips", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("button", { name: "Remove Home Deep Cleaning" }));

    expect(screen.queryByLabelText("Selected services")).not.toBeInTheDocument();
  });

  it("shows a compact, secondary requirements preview inside the configuration panel", async () => {
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
    const user = userEvent.setup();
    const initial: SkillsServicesDraft = {
      skillIds: [],
      services: [{ serviceId: deepCleaningId, priceAmount: "", priceCurrency: "USD", experienceYears: "", notes: "" }],
    };
    render(<Controlled initial={initial} />);

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByText("Customers booking this service will be asked for:")).toBeInTheDocument();
    expect(mockedGetServiceRequirements).toHaveBeenCalledWith("home-deep-cleaning");
  });

  it("shows an error state with retry when the catalog fails to load", async () => {
    setup();
    mockedListCatalogServices.mockRejectedValueOnce(new Error("down"));

    const user = userEvent.setup();
    render(<Controlled />);

    expect(await screen.findByText("Couldn't load the services catalog.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await user.click(await screen.findByRole("combobox"));
    expect(await screen.findByText("Home Deep Cleaning")).toBeInTheDocument();
  });

  it("blocks continuing with no service selected", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await screen.findByRole("combobox");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Search for and select at least one service you're qualified to provide.")).toBeInTheDocument();
  });
});
