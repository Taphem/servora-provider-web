import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "@/components/provider/ProfileForm";
import { ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, createMyProvider: vi.fn(), updateMyProvider: vi.fn(), uploadMyProfilePhoto: vi.fn(), validateProfilePhoto: vi.fn(() => null) };
});

const { createMyProvider, updateMyProvider, uploadMyProfilePhoto, validateProfilePhoto } = await import("@/lib/api/provider");
const mockedCreate = vi.mocked(createMyProvider);
const mockedUpdate = vi.mocked(updateMyProvider);
const mockedUpload = vi.mocked(uploadMyProfilePhoto);
const mockedValidatePhoto = vi.mocked(validateProfilePhoto);

describe("ProfileForm (onboarding, create mode)", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedUpload.mockReset();
    mockedValidatePhoto.mockReset();
    mockedValidatePhoto.mockReturnValue(null);
  });

  it("shows a validation error instead of calling the API when the display name is too short", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<ProfileForm mode="create" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Display name"), "J");
    await user.click(screen.getByRole("button", { name: "Create provider profile" }));

    expect(await screen.findByText("Enter at least 2 characters")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("submits a minimal valid profile and calls onSuccess with the created provider", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const created = { id: "p1", displayName: "Jordan Lee" };
    mockedCreate.mockResolvedValue(created as never);

    render(<ProfileForm mode="create" onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText("Display name"), "Jordan Lee");
    await user.click(screen.getByRole("button", { name: "Create provider profile" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0]).toMatchObject({ displayName: "Jordan Lee" });
    expect(onSuccess).toHaveBeenCalledWith(created);
  });

  it("surfaces the backend's error message instead of a generic one when the API rejects", async () => {
    const user = userEvent.setup();
    mockedCreate.mockRejectedValue(new ApiError("SLUG_TAKEN", "That URL is already in use.", 409));

    render(<ProfileForm mode="create" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Display name"), "Jordan Lee");
    await user.click(screen.getByRole("button", { name: "Create provider profile" }));

    expect(await screen.findByText("That URL is already in use.")).toBeInTheDocument();
  });

  it("does not send a caller-controlled slug", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ id: "p1" } as never);

    render(<ProfileForm mode="create" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Display name"), "Jordan Lee");
    await user.click(screen.getByRole("button", { name: "Create provider profile" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const body = mockedCreate.mock.calls[0][0];
    expect(Object.prototype.hasOwnProperty.call(body, "slug")).toBe(false);
  });

  it("allows an individual provider to leave business name blank", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ id: "p1" } as never);
    render(<ProfileForm mode="create" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Display name"), "Asha Cleaner");
    await user.click(screen.getByRole("button", { name: "Create provider profile" }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0]).not.toHaveProperty("businessName");
  });

  it("uploads the selected supported image immediately and persists its returned URL on submit", async () => {
    const user = userEvent.setup();
    mockedUpload.mockResolvedValue("https://res.cloudinary.com/servora/image/upload/servora/providers/u/p.webp");
    mockedCreate.mockResolvedValue({ id: "p1" } as never);
    render(<ProfileForm mode="create" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Display name"), "Asha Cleaner");
    const file = new File(["image"], "portrait.webp", { type: "image/webp" });
    await user.upload(screen.getByLabelText("Profile photo"), file);
    await waitFor(() => expect(mockedUpload).toHaveBeenCalledWith(file));
    await screen.findByText("portrait.webp uploaded.");

    await user.click(screen.getByRole("button", { name: "Create provider profile" }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0]).toMatchObject({ profilePhotoUrl: expect.stringContaining("cloudinary.com") });
  });

  it("shows an unsupported photo error and does not upload", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockedValidatePhoto.mockReturnValue("Choose a JPG, JPEG, PNG, or WebP image.");
    render(<ProfileForm mode="create" onSuccess={vi.fn()} />);
    await user.upload(screen.getByLabelText("Profile photo"), new File(["image"], "portrait.gif", { type: "image/gif" }));
    expect(await screen.findByText("Choose a JPG, JPEG, PNG, or WebP image.")).toBeInTheDocument();
    expect(mockedUpload).not.toHaveBeenCalled();
  });
});
