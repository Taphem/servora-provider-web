import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillsExpertise } from "@/components/provider/onboarding/SkillsExpertise";
import { ApiError } from "@/lib/api/client";
import type { Skill } from "@/types/domain";

vi.mock("@/lib/api/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/provider")>();
  return { ...actual, listSkillsCatalog: vi.fn(), createMySkill: vi.fn() };
});

const providerApi = await import("@/lib/api/provider");
const mockedListSkillsCatalog = vi.mocked(providerApi.listSkillsCatalog);
const mockedCreateMySkill = vi.mocked(providerApi.createMySkill);

const leakDetection: Skill = { id: "s1", name: "Leak detection", slug: "leak-detection", status: "ACTIVE", createdAt: "", updatedAt: "" };
const pipeFitting: Skill = { id: "s2", name: "Pipe fitting", slug: "pipe-fitting", status: "ACTIVE", createdAt: "", updatedAt: "" };

function setup(catalog: Skill[] = [leakDetection, pipeFitting]) {
  mockedListSkillsCatalog.mockResolvedValue({ data: catalog, pagination: { page: 1, pageSize: 100, total: catalog.length, totalPages: 1 } });
}

function Controlled({ initial = [] as Skill[] }: { initial?: Skill[] }) {
  const [value, setValue] = useState(initial);
  return <SkillsExpertise value={value} onChange={setValue} />;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SkillsExpertise", () => {
  it("shows a compact prompt (not a chip dump) when nothing is selected yet", async () => {
    setup();
    render(<Controlled />);
    await screen.findByRole("combobox", { name: "Search or add a skill" });
    expect(screen.getByText("You can add skills from the catalog, or create your own.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Selected expertise")).not.toBeInTheDocument();
  });

  it("selecting an existing catalog skill from the popover adds it to Selected expertise", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search or add a skill" }));
    await user.click(await screen.findByRole("option", { name: "Leak detection" }));

    expect(await screen.findByLabelText("Selected expertise")).toHaveTextContent("Leak detection");
  });

  it("lets a provider add a skill that does not exist in the catalog", async () => {
    setup();
    mockedCreateMySkill.mockResolvedValue({ id: "new-1", name: "Split AC servicing", slug: "split-ac-servicing", status: "ACTIVE", createdAt: "", updatedAt: "" });
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox", { name: "Search or add a skill" });
    await user.click(search);
    await user.type(search, "Split AC servicing");
    await user.click(await screen.findByRole("button", { name: /Add "Split AC servicing" as a new skill/ }));

    await waitFor(() => expect(mockedCreateMySkill).toHaveBeenCalledWith("Split AC servicing"));
    expect(await screen.findByLabelText("Selected expertise")).toHaveTextContent("Split AC servicing");
  });

  it("does not require a newly added skill to exist in the Services catalog", async () => {
    setup([]); // empty catalog — no Services-derived suggestions at all
    mockedCreateMySkill.mockResolvedValue({ id: "new-1", name: "Compressor diagnostics", slug: "compressor-diagnostics", status: "ACTIVE", createdAt: "", updatedAt: "" });
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox", { name: "Search or add a skill" });
    await user.click(search);
    await user.type(search, "Compressor diagnostics");
    await user.click(await screen.findByRole("button", { name: /Add "Compressor diagnostics" as a new skill/ }));

    expect(await screen.findByLabelText("Selected expertise")).toHaveTextContent("Compressor diagnostics");
  });

  it("supports adding multiple skills", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(await screen.findByRole("combobox", { name: "Search or add a skill" }));
    await user.click(await screen.findByRole("option", { name: "Leak detection" }));
    await user.click(screen.getByRole("combobox", { name: "Search or add a skill" }));
    await user.click(await screen.findByRole("option", { name: "Pipe fitting" }));

    const selected = await screen.findByLabelText("Selected expertise");
    expect(selected).toHaveTextContent("Leak detection");
    expect(selected).toHaveTextContent("Pipe fitting");
  });

  it("removes a skill", async () => {
    setup();
    const user = userEvent.setup();
    render(<Controlled initial={[leakDetection]} />);

    await user.click(screen.getByRole("button", { name: "Remove Leak detection" }));
    expect(screen.queryByLabelText("Selected expertise")).not.toBeInTheDocument();
  });

  it("shows a clear error if creating a skill fails, without adding a fake chip", async () => {
    setup();
    mockedCreateMySkill.mockRejectedValue(new ApiError("VALIDATION_FAILED", "Enter at least 2 characters.", 400));
    const user = userEvent.setup();
    render(<Controlled />);

    const search = await screen.findByRole("combobox", { name: "Search or add a skill" });
    await user.click(search);
    await user.type(search, "X");
    await user.click(await screen.findByRole("button", { name: /Add "X" as a new skill/ }));

    expect(await screen.findByText("Enter at least 2 characters.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Selected expertise")).not.toBeInTheDocument();
  });
});
