import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { becomeProvider } from "@/lib/auth/api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("becomeProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts the strict empty JSON body using the cookie-authenticated client", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(200, { role: "BUSINESS_OWNER" }));

    await becomeProvider();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/become-provider"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
  });
});
