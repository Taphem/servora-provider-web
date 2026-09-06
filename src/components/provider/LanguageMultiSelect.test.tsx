import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageMultiSelect } from "@/components/provider/LanguageMultiSelect";

function Controlled({ initial = [] as string[] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial);
  return <LanguageMultiSelect value={value} onChange={setValue} />;
}

describe("LanguageMultiSelect", () => {
  it("filters the dropdown as the provider searches", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "hin");
    expect(screen.getByRole("option", { name: "Hindi" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "English" })).not.toBeInTheDocument();
  });

  it("adds a selected language as a chip and removes it from the dropdown", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "English" }));

    expect(screen.getByText("English")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("option", { name: "English" })).not.toBeInTheDocument();
  });

  it("supports selecting multiple languages", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "English" }));
    await user.click(screen.getByRole("combobox"));
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

  it("selects the highlighted option on Enter (keyboard accessible)", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.type(combobox, "tel");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Telugu")).toBeInTheDocument();
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

  it("cannot select the same language twice", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["en"]} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("option", { name: "English" })).not.toBeInTheDocument();
    expect(screen.getAllByText("English")).toHaveLength(1);
  });
});
