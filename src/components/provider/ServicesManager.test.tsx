import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServicesManager } from "@/components/provider/ServicesManager";
import type { CatalogService, ProviderService } from "@/types/domain";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, listMyServices: vi.fn(), createMyService: vi.fn() };
});
vi.mock("@/lib/api/services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/services")>();
  return { ...actual, listCatalogServices: vi.fn() };
});

const { listMyServices, createMyService } = await import("@/lib/api/provider");
const { listCatalogServices } = await import("@/lib/api/services");
const mockedListMyServices = vi.mocked(listMyServices);
const mockedCreateMyService = vi.mocked(createMyService);
const mockedListCatalogServices = vi.mocked(listCatalogServices);

const houseCleaningId = "11111111-1111-4111-8111-111111111111";
const plumbingId = "22222222-2222-4222-8222-222222222222";

const houseCleaning: CatalogService = {
  id: houseCleaningId,
  categoryId: "11111111-1111-4111-8111-000000000001",
  name: "House Cleaning",
  slug: "house-cleaning",
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

const plumbing: CatalogService = { ...houseCleaning, id: plumbingId, name: "Plumbing Repair", slug: "plumbing" };

describe("ServicesManager — service selection", () => {
  beforeEach(() => {
    mockedListMyServices.mockReset();
    mockedCreateMyService.mockReset();
    mockedListCatalogServices.mockReset();
  });

  it("shows an empty state and lets the provider add their first service", async () => {
    mockedListMyServices.mockResolvedValue({ data: [] });
    mockedListCatalogServices.mockResolvedValue({
      data: [houseCleaning, plumbing],
      pagination: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
    });

    render(<ServicesManager />);

    expect(await screen.findByText("You haven't added any services yet")).toBeInTheDocument();
    const select = screen.getByLabelText("Service") as HTMLSelectElement;
    expect(within(select).getAllByRole("option")).toHaveLength(2);
  });

  it("excludes a service the provider already offers from the add-service picker", async () => {
    const offering: ProviderService = {
      id: "off-1",
      providerId: "p1",
      serviceId: houseCleaning.id,
      isEnabled: true,
      priceAmount: "60.00",
      priceCurrency: "USD",
      experienceYears: 5,
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    mockedListMyServices.mockResolvedValue({ data: [offering] });
    mockedListCatalogServices.mockResolvedValue({
      data: [houseCleaning, plumbing],
      pagination: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
    });

    render(<ServicesManager />);

    expect(await screen.findByText("House Cleaning")).toBeInTheDocument();
    const select = await screen.findByLabelText("Service");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Plumbing Repair"]);
    // The provider's own price, not the catalog's reference price, is shown as their offering's price.
    expect(screen.getByText(/USD 60.00/)).toBeInTheDocument();
  });

  it("submits the selected service id and reloads after adding", async () => {
    const user = userEvent.setup();
    mockedListMyServices.mockResolvedValue({ data: [] });
    mockedListCatalogServices.mockResolvedValue({
      data: [houseCleaning],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    mockedCreateMyService.mockResolvedValue({} as ProviderService);

    render(<ServicesManager />);
    await screen.findByLabelText("Service");
    await user.click(screen.getByRole("button", { name: "Add service" }));

    await waitFor(() => expect(mockedCreateMyService).toHaveBeenCalledTimes(1));
    expect(mockedCreateMyService).toHaveBeenCalledWith(expect.objectContaining({ serviceId: houseCleaning.id }));
    expect(mockedListMyServices).toHaveBeenCalledTimes(2); // initial load + reload after add
  });

  it("shows an error state with a retry action when loading fails", async () => {
    const user = userEvent.setup();
    mockedListMyServices.mockRejectedValueOnce(new Error("network down"));
    mockedListCatalogServices.mockRejectedValueOnce(new Error("network down"));
    mockedListMyServices.mockResolvedValue({ data: [] });
    mockedListCatalogServices.mockResolvedValue({
      data: [houseCleaning],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });

    render(<ServicesManager />);
    expect(await screen.findByText("Couldn't load your services.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("You haven't added any services yet")).toBeInTheDocument();
  });
});
