import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepServiceArea } from "@/components/provider/onboarding/StepServiceArea";
import { emptyServiceAreaAvailability } from "@/components/provider/onboarding/types";

describe("StepServiceArea", () => {
  it("renders the interactive map container and place search input", () => {
    render(
      <StepServiceArea
        value={emptyServiceAreaAvailability()}
        onChange={vi.fn()}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Search location or service area")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my current location" })).toBeInTheDocument();
    expect(screen.getByText("Interactive Map")).toBeInTheDocument();
  });

  it("adds a service area via manual form", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StepServiceArea
        value={emptyServiceAreaAvailability()}
        onChange={onChange}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByText("+ Add an area manually without search"));
    await user.type(screen.getByLabelText("City"), "Austin");
    await user.click(screen.getByRole("button", { name: "Add area" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ areas: [expect.objectContaining({ city: "Austin", countryCode: "US" })] }),
    );
  });

  it("removes an added area from the list", async () => {
    const user = userEvent.setup();
    const value = {
      ...emptyServiceAreaAvailability(),
      areas: [
        {
          tempId: "t1",
          countryCode: "US",
          region: "",
          city: "Austin",
          postalCode: "",
          latitude: "30.2672",
          longitude: "-97.7431",
          radiusKm: "15",
          formattedAddress: "Austin, TX, USA",
        },
      ],
    };
    const onChange = vi.fn();
    render(<StepServiceArea value={value} onChange={onChange} onFinish={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Remove Austin" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ areas: [] }));
  });

  it("supports geolocation via Use my current location", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      });
    });

    Object.defineProperty(global.navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    render(
      <StepServiceArea
        value={emptyServiceAreaAvailability()}
        onChange={onChange}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Use my current location" }));

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        areas: [
          expect.objectContaining({
            latitude: "12.9716",
            longitude: "77.5946",
          }),
        ],
      }),
    );
  });

  it("handles geolocation denial gracefully without crashing", async () => {
    const user = userEvent.setup();
    const mockGetCurrentPosition = vi.fn().mockImplementation((_, error) => {
      error({ code: 1, PERMISSION_DENIED: 1 });
    });

    Object.defineProperty(global.navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });

    render(
      <StepServiceArea
        value={emptyServiceAreaAvailability()}
        onChange={vi.fn()}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(await screen.findByText(/Location permission was denied/)).toBeInTheDocument();
  });

  it("toggles a day on to reveal its time range, off to hide it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StepServiceArea
        value={emptyServiceAreaAvailability()}
        onChange={onChange}
        onFinish={vi.fn()}
        onBack={vi.fn()}
      />,
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
    render(
      <StepServiceArea
        value={emptyServiceAreaAvailability()}
        onChange={vi.fn()}
        onFinish={onFinish}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(await screen.findByText("Add at least one area you serve.")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("blocks finishing without at least one available day", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const value = {
      ...emptyServiceAreaAvailability(),
      areas: [
        {
          tempId: "t1",
          countryCode: "US",
          region: "",
          city: "Austin",
          postalCode: "",
          latitude: "30.2672",
          longitude: "-97.7431",
          radiusKm: "15",
        },
      ],
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
      areas: [
        {
          tempId: "t1",
          countryCode: "US",
          region: "",
          city: "Austin",
          postalCode: "",
          latitude: "30.2672",
          longitude: "-97.7431",
          radiusKm: "15",
        },
      ],
      weekly: emptyServiceAreaAvailability().weekly.map((s, i) => (i === 1 ? { ...s, enabled: true } : s)),
    };
    render(<StepServiceArea value={value} onChange={vi.fn()} onFinish={onFinish} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
