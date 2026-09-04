import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useProvider } from "@/hooks/useProvider";
import { ApiError } from "@/lib/api/client";
import type { Provider } from "@/types/domain";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, getMyProvider: vi.fn() };
});

const { getMyProvider } = await import("@/lib/api/provider");
const mockedGetMyProvider = vi.mocked(getMyProvider);

function ProbeComponent() {
  const { provider, status, error } = useProvider(true);
  return (
    <div>
      <p>status: {status}</p>
      {provider ? <p>provider: {provider.displayName}</p> : null}
      {error ? <p>error: {error.message}</p> : null}
    </div>
  );
}

describe("useProvider", () => {
  beforeEach(() => {
    mockedGetMyProvider.mockReset();
  });

  it("starts in the loading state", () => {
    mockedGetMyProvider.mockReturnValue(new Promise(() => {}));
    render(<ProbeComponent />);
    expect(screen.getByText("status: loading")).toBeInTheDocument();
  });

  it("resolves to ready with the fetched provider on success", async () => {
    mockedGetMyProvider.mockResolvedValue({ displayName: "Jordan Lee" } as Provider);
    render(<ProbeComponent />);
    await waitFor(() => expect(screen.getByText("status: ready")).toBeInTheDocument());
    expect(screen.getByText("provider: Jordan Lee")).toBeInTheDocument();
  });

  it("treats a 404 as the expected 'not onboarded yet' state, not an error", async () => {
    mockedGetMyProvider.mockRejectedValue(new ApiError("PROVIDER_NOT_FOUND", "Not found", 404));
    render(<ProbeComponent />);
    await waitFor(() => expect(screen.getByText("status: not-onboarded")).toBeInTheDocument());
    expect(screen.queryByText(/^error:/)).not.toBeInTheDocument();
  });

  it("surfaces any other failure as the error state", async () => {
    mockedGetMyProvider.mockRejectedValue(new ApiError("INTERNAL_ERROR", "Server exploded", 500));
    render(<ProbeComponent />);
    await waitFor(() => expect(screen.getByText("status: error")).toBeInTheDocument());
    expect(screen.getByText("error: Server exploded")).toBeInTheDocument();
  });
});
