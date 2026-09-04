import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiRequest, ApiError, ClientErrorCode } from "@/lib/api/client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends credentials: include on every request", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(200, { ok: true }));
    await apiRequest("/api/v1/providers/me");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("never attaches an Authorization header", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(200, { ok: true }));
    await apiRequest("/api/v1/providers/me");
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("returns parsed JSON on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(200, { id: "abc" }));
    const result = await apiRequest<{ id: string }>("/api/v1/providers/me");
    expect(result).toEqual({ id: "abc" });
  });

  it("returns undefined for 204 No Content", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiRequest("/api/v1/providers/me/services/x");
    expect(result).toBeUndefined();
  });

  it("serializes a JSON body and sets Content-Type when a body is provided", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(201, { id: "1" }));
    await apiRequest("/api/v1/providers/me", { method: "POST", body: { displayName: "Jordan" } });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect((init as RequestInit).body).toBe(JSON.stringify({ displayName: "Jordan" }));
    expect((init as RequestInit).headers).toEqual({ "Content-Type": "application/json" });
  });

  it("appends query params, omitting undefined values", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));
    await apiRequest("/api/v1/providers/skills", { query: { page: 2, pageSize: undefined } });
    const [url] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toContain("page=2");
    expect(url).not.toContain("pageSize");
  });

  it("throws ApiError built from the shared { error } envelope on a non-2xx response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(403, { error: { code: "FORBIDDEN", message: "Nope", requestId: "req-1" } }),
    );
    await expect(apiRequest("/api/v1/providers/me")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Nope",
      status: 403,
      requestId: "req-1",
    });
  });

  it("throws a synthetic ApiError when a non-2xx body isn't the expected envelope", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    await expect(apiRequest("/api/v1/providers/me")).rejects.toMatchObject({
      code: ClientErrorCode.MalformedResponse,
      status: 502,
    });
  });

  it("throws a network-error ApiError when fetch itself rejects, without leaking the underlying error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    let caught: unknown;
    try {
      await apiRequest("/api/v1/providers/me");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe(ClientErrorCode.NetworkError);
    expect((caught as ApiError).status).toBe(0);
  });
});
