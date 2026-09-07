import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadMyProfilePhoto, validateProfilePhoto } from "@/lib/api/provider";
import { ApiError } from "@/lib/api/client";
import { env } from "@/lib/env";

describe("validateProfilePhoto", () => {
  it("accepts JPG/JPEG, PNG, and WebP under 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateProfilePhoto(new File(["image"], `photo.${type.split("/")[1]}`, { type }))).toBeNull();
    }
  });

  it("rejects unsupported MIME types and oversize images", () => {
    expect(validateProfilePhoto(new File(["image"], "photo.gif", { type: "image/gif" }))).toContain("JPG");
    expect(validateProfilePhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "photo.jpg", { type: "image/jpeg" }))).toContain("5 MB");
  });
});

const signature = {
  uploadUrl: "https://api.cloudinary.com/v1_1/servora/image/upload",
  apiKey: "key123",
  timestamp: 1700000000,
  signature: "abc123signature",
  publicId: "servora/providers/u1/photo-uuid",
  uploadPreset: "servora_provider_photos",
  allowedFormats: ["jpg", "jpeg", "png", "webp"],
  maxBytes: 5 * 1024 * 1024,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("uploadMyProfilePhoto", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("requests a signature from the gateway, then uploads directly to Cloudinary with the exact signed parameters", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(200, signature))
      .mockResolvedValueOnce(jsonResponse(200, { secure_url: "https://res.cloudinary.com/servora/image/upload/v1/servora/providers/u1/photo-uuid.jpg", public_id: signature.publicId }));

    const url = await uploadMyProfilePhoto(new File(["x"], "photo.jpg", { type: "image/jpeg" }));

    expect(url).toBe("https://res.cloudinary.com/servora/image/upload/v1/servora/providers/u1/photo-uuid.jpg");
    const [signatureCall, uploadCall] = vi.mocked(global.fetch).mock.calls;
    expect(signatureCall[0]).toBe(`${env.apiBaseUrl}/api/v1/providers/me/profile-photo-upload`);
    expect((signatureCall[1] as RequestInit).method).toBe("POST");
    expect((signatureCall[1] as RequestInit).credentials).toBe("include");

    expect(uploadCall[0]).toBe(signature.uploadUrl);
    const form = (uploadCall[1] as RequestInit).body as FormData;
    expect(form.get("api_key")).toBe(signature.apiKey);
    expect(form.get("timestamp")).toBe(String(signature.timestamp));
    expect(form.get("signature")).toBe(signature.signature);
    expect(form.get("public_id")).toBe(signature.publicId);
    expect(form.get("upload_preset")).toBe(signature.uploadPreset);
    expect(form.get("allowed_formats")).toBe("jpg,jpeg,png,webp");
    expect(form.get("max_file_size")).toBeNull();
  });

  it("surfaces Cloudinary's own error message instead of a generic one, so a Render misconfiguration is diagnosable", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(jsonResponse(200, signature))
      .mockResolvedValueOnce(jsonResponse(400, { error: { message: "Invalid cloud_name servora" } }));

    await expect(uploadMyProfilePhoto(new File(["x"], "photo.jpg", { type: "image/jpeg" }))).rejects.toMatchObject({
      message: "Couldn't upload your profile photo: Invalid cloud_name servora",
    });
  });

  it("falls back to a generic message when Cloudinary's response has no parseable error", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(200, signature)).mockResolvedValueOnce(new Response("<html>502</html>", { status: 502 }));

    await expect(uploadMyProfilePhoto(new File(["x"], "photo.jpg", { type: "image/jpeg" }))).rejects.toMatchObject({
      message: "Couldn't upload your profile photo. Please try again.",
    });
  });

  it("rejects an unsupported file before requesting a signature at all", async () => {
    await expect(uploadMyProfilePhoto(new File(["x"], "photo.gif", { type: "image/gif" }))).rejects.toBeInstanceOf(ApiError);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
