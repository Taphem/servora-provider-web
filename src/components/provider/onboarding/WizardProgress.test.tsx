import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardProgress } from "@/components/provider/onboarding/WizardProgress";

describe("WizardProgress", () => {
  it("marks the current step as active and shows all three step labels", () => {
    render(<WizardProgress currentStep={2} />);
    const active = screen.getByText("Skills & expertise").closest("[aria-current='step']");
    expect(active).not.toBeNull();
    expect(screen.getAllByText("About you").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Service area").length).toBeGreaterThan(0);
  });

  it("shows a compact step count for narrow viewports", () => {
    render(<WizardProgress currentStep={3} />);
    expect(screen.getByText("Step 3 of 3 — Service area")).toBeInTheDocument();
  });
});
