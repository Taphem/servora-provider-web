import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageMultiSelect } from "@/components/provider/LanguageMultiSelect";

function Controlled({ initial = [] as string[] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <LanguageMultiSelect value={value} onChange={setValue} />
      <button type="button">Outside</button>
    </div>
  );
}

describe("LanguageMultiSelect — popover open/close", () => {
  it("is closed until the trigger is focused", () => {
    render(<Controlled />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the popover on focus", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the popover", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("LanguageMultiSelect — selection", () => {
  it("filters the dropdown as the provider searches", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "hin");
    expect(screen.getByRole("option", { name: /Hindi/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^English$/ })).not.toBeInTheDocument();
  });

  it("adds a selected language as a chip, and keeps it visible (checked) in the dropdown", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "English" }));

    expect(screen.getByLabelText("Selected languages")).toHaveTextContent("English");
    // Reopen and confirm English is still listed, now checked — not removed from the list.
    await user.click(screen.getByRole("combobox"));
    const englishOption = screen.getByRole("option", { name: "English" });
    expect(englishOption).toHaveAttribute("aria-selected", "true");
  });

  it("supports selecting multiple languages", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "English" }));
    await user.click(screen.getByRole("option", { name: "Hindi" }));

    expect(screen.getByLabelText("Selected languages")).toHaveTextContent("English");
    expect(screen.getByLabelText("Selected languages")).toHaveTextContent("Hindi");
  });

  it("removes a language when its chip's remove button is clicked", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["en", "hi"]} />);
    await user.click(screen.getByRole("button", { name: "Remove English" }));

    expect(screen.queryByText("English")).not.toBeInTheDocument();
    expect(screen.getByText("Hindi")).toBeInTheDocument();
  });

  it("clicking an already-selected option in the dropdown deselects it", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["en"]} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "English" }));

    expect(screen.queryByLabelText("Selected languages")).not.toBeInTheDocument();
  });

  it("selects the highlighted option on Enter (keyboard accessible)", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.type(combobox, "tel");
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("Selected languages")).toHaveTextContent("Telugu");
  });

  it("never adds a language for an unmatched, freeform search term", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.type(combobox, "xx-not-a-language");
    await user.keyboard("{Enter}");

    expect(screen.getByText("No languages found.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Selected languages")).not.toBeInTheDocument();
  });

  it("shows a checkmark for an already-selected language", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["en"]} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "English" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Hindi" })).toHaveAttribute("aria-selected", "false");
  });
});
