import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoUploader } from "@/components/provider/PhotoUploader";
import { ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, uploadMyProfilePhoto: vi.fn() };
});

const { uploadMyProfilePhoto } = await import("@/lib/api/provider");
const mockedUpload = vi.mocked(uploadMyProfilePhoto);

// jsdom has no real object-URL backing store; this just needs to not throw.
beforeEach(() => {
  mockedUpload.mockReset();
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => "blob:mock";
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
});

describe("PhotoUploader", () => {
  it("shows an empty state with a clear call to action", () => {
    render(<PhotoUploader onUploaded={vi.fn()} />);
    expect(screen.getByText("Add profile photo")).toBeInTheDocument();
    expect(screen.getByText(/JPG, JPEG, PNG, or WebP/)).toBeInTheDocument();
  });

  it("uploads a supported image, shows a preview, and reports the returned URL", async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    mockedUpload.mockResolvedValue("https://res.cloudinary.com/servora/image/upload/servora/providers/u1/abc.webp");
    render(<PhotoUploader onUploaded={onUploaded} />);

    const file = new File(["image"], "portrait.webp", { type: "image/webp" });
    await user.upload(screen.getByLabelText("Profile photo"), file);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(expect.stringContaining("cloudinary.com")));
    expect(screen.getByText("portrait.webp uploaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("rejects an unsupported file type without uploading", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PhotoUploader onUploaded={vi.fn()} />);

    await user.upload(screen.getByLabelText("Profile photo"), new File(["x"], "photo.gif", { type: "image/gif" }));

    expect(await screen.findByText("Choose a JPG, JPEG, PNG, or WebP image.")).toBeInTheDocument();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB without uploading", async () => {
    const user = userEvent.setup();
    render(<PhotoUploader onUploaded={vi.fn()} />);

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Profile photo"), big);

    expect(await screen.findByText(/smaller than 5 MB/)).toBeInTheDocument();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("shows an error state and allows retrying a failed upload", async () => {
    const user = userEvent.setup();
    mockedUpload.mockRejectedValueOnce(new ApiError("CLIENT_PROFILE_PHOTO_UPLOAD_FAILED", "Couldn't upload your profile photo. Please try again.", 0));
    mockedUpload.mockResolvedValueOnce("https://res.cloudinary.com/servora/image/upload/servora/providers/u1/abc.jpg");
    const onUploaded = vi.fn();
    render(<PhotoUploader onUploaded={onUploaded} />);

    await user.upload(screen.getByLabelText("Profile photo"), new File(["x"], "photo.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("Couldn't upload your profile photo. Please try again.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry upload" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(mockedUpload).toHaveBeenCalledTimes(2);
  });

  it("clears the photo and calls onRemove when removed", async () => {
    const user = userEvent.setup();
    mockedUpload.mockResolvedValue("https://res.cloudinary.com/servora/image/upload/servora/providers/u1/abc.png");
    const onRemove = vi.fn();
    render(<PhotoUploader onUploaded={vi.fn()} onRemove={onRemove} />);

    await user.upload(screen.getByLabelText("Profile photo"), new File(["x"], "photo.png", { type: "image/png" }));
    await screen.findByRole("button", { name: "Remove photo" });

    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(screen.getByText("Add profile photo")).toBeInTheDocument();
  });

  it("shows the currently saved photo when a value is provided", () => {
    render(<PhotoUploader value="https://res.cloudinary.com/servora/image/upload/servora/providers/u1/existing.jpg" onUploaded={vi.fn()} />);
    expect(screen.getByText("Current profile photo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
  });
});
