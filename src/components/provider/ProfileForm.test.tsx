import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "@/components/provider/ProfileForm";
import { ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, createMyProvider: vi.fn(), updateMyProvider: vi.fn() };
});

const { createMyProvider, updateMyProvider } = await import("@/lib/api/provider");
const mockedCreate = vi.mocked(createMyProvider);
const mockedUpdate = vi.mocked(updateMyProvider);

describe("ProfileForm (onboarding, create mode)", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
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

  it("omits an empty slug rather than sending an empty string", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ id: "p1" } as never);

    render(<ProfileForm mode="create" onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText("Display name"), "Jordan Lee");
    await user.click(screen.getByRole("button", { name: "Create provider profile" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    const body = mockedCreate.mock.calls[0][0];
    expect(Object.prototype.hasOwnProperty.call(body, "slug")).toBe(false);
  });
});
