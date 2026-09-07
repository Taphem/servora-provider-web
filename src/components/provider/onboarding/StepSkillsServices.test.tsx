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

describe("StepSkillsServices — services section", () => {
  it("shows a compact empty state (no giant box) before any service is added", async () => {
    setup();
    render(<Controlled />);

    await screen.findByRole("combobox", { name: "Search services" });
    expect(screen.getByText("No services added yet")).toBeInTheDocument();
    expect(screen.getByText("Add the services you provide so customers know what they can book.")).toBeInTheDocument();
  });

  it("groups search results under real category headers", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Home Deep Cleaning" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Car Wash & Detailing" })).toBeInTheDocument();
  });

  it("narrows results as the provider types, without exposing any service id", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox", { name: "Search services" });
    await user.click(search);
    await user.type(search, "car wash");

    expect(screen.getByRole("option", { name: "Car Wash & Detailing" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Home Deep Cleaning" })).not.toBeInTheDocument();
    expect(screen.queryByText(carWashId)).not.toBeInTheDocument();
  });

  it("selecting a service from search results adds it as a card, expanded and ready to configure", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));

    expect(screen.queryByText("No services added yet")).not.toBeInTheDocument();
    expect(screen.getByText("Home Deep Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Save service" })).toBeInTheDocument();
    expect(screen.getByLabelText("Price amount")).toBeInTheDocument();
  });

  it("supports adding a second service, each as its own card", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Car Wash & Detailing" }));

    expect(screen.getByText("Home Deep Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Car Wash & Detailing")).toBeInTheDocument();
  });

  it("collapses a saved service into a summary card showing its price, and can be reopened to edit", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.type(screen.getByLabelText("Price amount"), "80");
    await user.click(screen.getByRole("button", { name: "Save service" }));

    // Collapsed: price amount input is gone, replaced by a summary badge.
    expect(screen.queryByLabelText("Price amount")).not.toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "INR 80")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByLabelText("Price amount")).toHaveValue(80);
  });

  it("removes a service via its card action", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));
    await user.click(screen.getByRole("button", { name: "Remove service" }));

    // The offering card (with its Edit/Remove actions) is gone — the name may still
    // legitimately reappear as a "Popular services" suggestion now that it's unselected.
    expect(screen.queryByRole("button", { name: "Remove service" })).not.toBeInTheDocument();
    expect(screen.getByText("No services added yet")).toBeInTheDocument();
  });

  it("shows an error state with retry when the catalog fails to load", async () => {
    setup();
    mockedListCatalogServices.mockRejectedValueOnce(new Error("down"));

    const user = userEvent.setup();
    render(<Controlled />);

    expect(await screen.findByText("Couldn't load the services catalog.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    expect(await screen.findByRole("option", { name: "Home Deep Cleaning" })).toBeInTheDocument();
  });

  it("blocks continuing with no service selected", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await screen.findByRole("combobox", { name: "Search services" });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Search for and select at least one service you're qualified to provide.")).toBeInTheDocument();
  });
});

describe("StepSkillsServices — currency", () => {
  it("defaults a newly configured service's price to INR, offered as a select rather than free text", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));

    const currency = await screen.findByLabelText("Currency");
    expect(currency.tagName).toBe("SELECT");
    expect(currency).toHaveValue("INR");
  });

  it("offers INR and USD as the only currency choices", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));

    const currency = await screen.findByLabelText("Currency");
    const optionValues = Array.from(currency.querySelectorAll("option")).map((o) => o.getAttribute("value"));
    expect(optionValues).toEqual(["INR", "USD"]);
  });

  it("keeps price as a plain numeric input", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search services" }));
    await user.click(screen.getByRole("option", { name: "Home Deep Cleaning" }));

    expect(screen.getByLabelText("Price amount")).toHaveAttribute("type", "number");
  });
});
