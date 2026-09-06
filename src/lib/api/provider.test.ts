import { describe, expect, it } from "vitest";
import { validateProfilePhoto } from "@/lib/api/provider";

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
