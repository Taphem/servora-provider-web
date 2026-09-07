import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoUploader } from "@/components/provider/PhotoUploader";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, uploadMyProfilePhoto: vi.fn() };
});

const { uploadMyProfilePhoto } = await import("@/lib/api/provider");
const mockedUpload = vi.mocked(uploadMyProfilePhoto);

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
    render(<PhotoUploader onFileSelect={vi.fn()} />);
    expect(screen.getByText("Add profile photo")).toBeInTheDocument();
    expect(screen.getByText(/JPG, JPEG, PNG, or WebP/)).toBeInTheDocument();
  });

  it("validates a supported image, displays preview, and passes pending file to onFileSelect WITHOUT calling Cloudinary", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    const { rerender } = render(<PhotoUploader onFileSelect={onFileSelect} />);

    const file = new File(["image"], "portrait.webp", { type: "image/webp" });
    await user.upload(screen.getByLabelText("Profile photo"), file);

    // Verify onFileSelect was called with the file
    expect(onFileSelect).toHaveBeenCalledWith(file);
    // Crucial: verify that NO Cloudinary upload took place
    expect(mockedUpload).not.toHaveBeenCalled();

    // Rerender with pendingFile in state
    rerender(<PhotoUploader pendingFile={file} onFileSelect={onFileSelect} />);

    expect(screen.getByText(/Selected: portrait\.webp/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("rejects an unsupported file type without calling onFileSelect", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onFileSelect = vi.fn();
    render(<PhotoUploader onFileSelect={onFileSelect} />);

    await user.upload(screen.getByLabelText("Profile photo"), new File(["x"], "photo.gif", { type: "image/gif" }));

    expect(await screen.findByText("Choose a JPG, JPEG, PNG, or WebP image.")).toBeInTheDocument();
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB without calling onFileSelect", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    render(<PhotoUploader onFileSelect={onFileSelect} />);

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Profile photo"), big);

    expect(await screen.findByText(/smaller than 5 MB/)).toBeInTheDocument();
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("reverts to saved photo when cancelling a pending replacement", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    const onRemove = vi.fn();

    const pending = new File(["replacement"], "replacement.png", { type: "image/png" });
    const savedUrl = "https://res.cloudinary.com/servora/image/upload/servora/providers/u1/existing.jpg";

    render(
      <PhotoUploader
        savedUrl={savedUrl}
        pendingFile={pending}
        onFileSelect={onFileSelect}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText(/Selected: replacement\.png/)).toBeInTheDocument();
    const cancelButton = screen.getByRole("button", { name: "Cancel change" });
    await user.click(cancelButton);

    // Clears the pending file
    expect(onFileSelect).toHaveBeenCalledWith(null);
    // Does NOT call onRemove, because the saved photo is preserved
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("calls onRemove when removing a saved photo with no pending replacement", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const savedUrl = "https://res.cloudinary.com/servora/image/upload/servora/providers/u1/existing.jpg";

    render(<PhotoUploader savedUrl={savedUrl} onRemove={onRemove} />);

    expect(screen.getByText("Current profile photo.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove photo" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("displays uploadError and spinner when isUploading is true", () => {
    const pending = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const { rerender } = render(
      <PhotoUploader pendingFile={pending} isUploading={true} />,
    );

    expect(screen.getByText("Uploading photo.jpg…")).toBeInTheDocument();

    rerender(
      <PhotoUploader pendingFile={pending} uploadError="Upload failed from network" />,
    );
    expect(screen.getByText("Upload failed from network")).toBeInTheDocument();
  });
});
