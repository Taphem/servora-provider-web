import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { AccessBoundary } from "@/components/provider/AccessBoundary";

vi.mock("@/lib/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/api")>();
  return { ...actual, getSession: vi.fn() };
});

const { getSession } = await import("@/lib/auth/api");
const mockedGetSession = vi.mocked(getSession);

describe("AccessBoundary", () => {
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

  it("explains the limitation, and never renders gated content, for a CUSTOMER account", async () => {
    mockedGetSession.mockResolvedValue({
      authenticated: true,
      userId: "u1",
      email: "shopper@example.com",
      role: "CUSTOMER",
      emailVerified: true,
      phoneVerified: false,
    });
    renderWithProviders(
      <AccessBoundary>
        <p>Provider dashboard content</p>
      </AccessBoundary>,
    );
    await waitFor(() =>
      expect(screen.getByText("Provider access isn't self-serve yet")).toBeInTheDocument(),
    );
    expect(screen.getByText("shopper@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Provider dashboard content")).not.toBeInTheDocument();
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
