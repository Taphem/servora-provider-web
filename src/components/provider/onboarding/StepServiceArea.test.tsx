import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepServiceArea } from "@/components/provider/onboarding/StepServiceArea";
import { emptyServiceAreaAvailability } from "@/components/provider/onboarding/types";

describe("StepServiceArea", () => {
  it("adds a service area as a removable chip", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StepServiceArea value={emptyServiceAreaAvailability()} onChange={onChange} onFinish={vi.fn()} onBack={vi.fn()} />,
    );

    await user.type(screen.getByLabelText("City"), "Austin");
    await user.click(screen.getByRole("button", { name: "Add area" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ areas: [expect.objectContaining({ city: "Austin", countryCode: "US" })] }),
    );
  });

  it("removes an added area from the chip list", async () => {
    const user = userEvent.setup();
    const value = {
      ...emptyServiceAreaAvailability(),
      areas: [{ tempId: "t1", countryCode: "US", region: "", city: "Austin", postalCode: "", latitude: "", longitude: "", radiusKm: "" }],
    };
    const onChange = vi.fn();
    render(<StepServiceArea value={value} onChange={onChange} onFinish={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Remove Austin" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ areas: [] }));
  });

  it("keeps the precise radius control disabled until latitude and longitude are set", async () => {
    const user = userEvent.setup();
    render(<StepServiceArea value={emptyServiceAreaAvailability()} onChange={vi.fn()} onFinish={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Set a precise coverage radius (optional)" }));
    expect(screen.getByRole("slider")).toBeDisabled();

    await user.type(screen.getByLabelText("Latitude"), "30.27");
    await user.type(screen.getByLabelText("Longitude"), "-97.74");
    expect(screen.getByRole("slider")).toBeEnabled();
  });

  it("toggles a day on to reveal its time range, off to hide it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StepServiceArea value={emptyServiceAreaAvailability()} onChange={onChange} onFinish={vi.fn()} onBack={vi.fn()} />,
    );

    expect(screen.getAllByText("Unavailable").length).toBe(7);
    await user.click(screen.getByRole("switch", { name: "Monday availability" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ weekly: expect.arrayContaining([expect.objectContaining({ enabled: true })]) }),
    );
  });

  it("blocks finishing without at least one area", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<StepServiceArea value={emptyServiceAreaAvailability()} onChange={vi.fn()} onFinish={onFinish} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(await screen.findByText("Add at least one area you serve.")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("blocks finishing without at least one available day", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const value = {
      ...emptyServiceAreaAvailability(),
      areas: [{ tempId: "t1", countryCode: "US", region: "", city: "Austin", postalCode: "", latitude: "", longitude: "", radiusKm: "" }],
    };
    render(<StepServiceArea value={value} onChange={vi.fn()} onFinish={onFinish} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(await screen.findByText("Turn on at least one day you're available.")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("calls onFinish once an area and at least one day are set", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn().mockResolvedValue(undefined);
    const value = {
      ...emptyServiceAreaAvailability(),
      areas: [{ tempId: "t1", countryCode: "US", region: "", city: "Austin", postalCode: "", latitude: "", longitude: "", radiusKm: "" }],
      weekly: emptyServiceAreaAvailability().weekly.map((s, i) => (i === 1 ? { ...s, enabled: true } : s)),
    };
    render(<StepServiceArea value={value} onChange={vi.fn()} onFinish={onFinish} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
