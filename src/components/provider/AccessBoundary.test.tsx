import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { AccessBoundary } from "@/components/provider/AccessBoundary";
import { ApiError } from "@/lib/api/client";

vi.mock("@/lib/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/api")>();
  return { ...actual, getSession: vi.fn(), becomeProvider: vi.fn() };
});

const { getSession, becomeProvider } = await import("@/lib/auth/api");
const mockedGetSession = vi.mocked(getSession);
const mockedBecomeProvider = vi.mocked(becomeProvider);

describe("AccessBoundary", () => {
  beforeEach(() => {
    mockedGetSession.mockReset();
    mockedBecomeProvider.mockReset();
  });

  it("shows a loading state before the session check resolves", () => {
    mockedGetSession.mockReturnValue(new Promise(() => {}));
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Provider dashboard content")).not.toBeInTheDocument();
  });

  it("prompts sign-in, and never renders gated content, when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue({ authenticated: false });
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    await waitFor(() => expect(screen.getByText("Sign in to continue")).toBeInTheDocument());
    expect(screen.queryByText("Provider dashboard content")).not.toBeInTheDocument();
  });

  it("lets a verified CUSTOMER become a provider, refreshes the session, and unlocks content", async () => {
    const user = userEvent.setup();
    mockedGetSession.mockResolvedValue({
      authenticated: true,
      userId: "u1",
      email: "shopper@example.com",
      role: "CUSTOMER",
      emailVerified: true,
      phoneVerified: false,
    });
    mockedGetSession.mockResolvedValueOnce({
      authenticated: true,
      userId: "u1",
      email: "shopper@example.com",
      role: "CUSTOMER",
      emailVerified: true,
      phoneVerified: false,
    });
    mockedGetSession.mockResolvedValueOnce({
      authenticated: true,
      userId: "u1",
      email: "shopper@example.com",
      role: "BUSINESS_OWNER",
      emailVerified: true,
      phoneVerified: false,
    });
    mockedBecomeProvider.mockResolvedValue(undefined);
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    const button = await screen.findByRole("button", { name: "Become a provider" });
    expect(screen.getByText("shopper@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Provider dashboard content")).not.toBeInTheDocument();
    await user.click(button);
    await waitFor(() => expect(mockedBecomeProvider).toHaveBeenCalledOnce());
    await waitFor(() => expect(mockedGetSession).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Provider dashboard content")).toBeInTheDocument();
  });

  it("keeps the CUSTOMER gate visible and shows a safe error when the transition fails", async () => {
    const user = userEvent.setup();
    mockedGetSession.mockResolvedValue({
      authenticated: true,
      userId: "u1",
      email: "shopper@example.com",
      role: "CUSTOMER",
      emailVerified: true,
      phoneVerified: false,
    });
    mockedBecomeProvider.mockRejectedValue(new ApiError("EMAIL_NOT_VERIFIED", "Verify your email first.", 403));
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    await user.click(await screen.findByRole("button", { name: "Become a provider" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Verify your email first.");
    expect(screen.queryByText("Provider dashboard content")).not.toBeInTheDocument();
    expect(mockedGetSession).toHaveBeenCalledTimes(1);
  });

  it("requires email verification before exposing the transition action", async () => {
    mockedGetSession.mockResolvedValue({
      authenticated: true,
      userId: "u1",
      email: "shopper@example.com",
      role: "CUSTOMER",
      emailVerified: false,
      phoneVerified: false,
    });
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    expect(await screen.findByText("Provider access unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Become a provider" })).not.toBeInTheDocument();
  });

  it("renders gated content for a BUSINESS_OWNER account", async () => {
    mockedGetSession.mockResolvedValue({
      authenticated: true,
      userId: "u2",
      email: "pro@example.com",
      role: "BUSINESS_OWNER",
      emailVerified: true,
      phoneVerified: false,
    });
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    await waitFor(() => expect(screen.getByText("Provider dashboard content")).toBeInTheDocument());
  });
});
