import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { DashboardView } from "@/components/provider/DashboardView";
import { ApiError } from "@/lib/api/client";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/lib/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/api")>();
  return { ...actual, getSession: vi.fn() };
});

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, getMyProvider: vi.fn() };
});

const { getSession } = await import("@/lib/auth/api");
const { getMyProvider } = await import("@/lib/api/provider");
const mockedGetSession = vi.mocked(getSession);
const mockedGetMyProvider = vi.mocked(getMyProvider);

describe("DashboardView", () => {
  beforeEach(() => {
    mockedGetSession.mockReset();
    mockedGetMyProvider.mockReset();
  });

  it("shows the onboarding route when a BUSINESS_OWNER has no provider record", async () => {
    mockedGetSession.mockResolvedValue({
      authenticated: true,
      userId: "u1",
      email: "owner@example.com",
      role: "BUSINESS_OWNER",
      emailVerified: true,
      phoneVerified: false,
    });
    mockedGetMyProvider.mockRejectedValue(new ApiError("PROVIDER_NOT_FOUND", "Not found", 404));

    renderWithProviders(<DashboardView />);

    expect(await screen.findByText("Set up your provider profile")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start onboarding" })).toHaveAttribute("href", "/onboarding");
  });
});
