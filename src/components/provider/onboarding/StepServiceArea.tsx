"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Plus, X } from "lucide-react";
import type { ZodIssue } from "zod";
import { createServiceAreaSchema, weeklySlotSchema } from "@/lib/validation/provider";
import type { AreaDraft, ServiceAreaAvailabilityDraft } from "@/components/provider/onboarding/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

/** Sunday=0 .. Saturday=6, servora-provider's day_of_week convention — displayed Monday-first. */
const DISPLAY_DAYS = [
  { index: 1, label: "Monday" },
  { index: 2, label: "Tuesday" },
  { index: 3, label: "Wednesday" },
  { index: 4, label: "Thursday" },
  { index: 5, label: "Friday" },
  { index: 6, label: "Saturday" },
  { index: 0, label: "Sunday" },
];

interface StepServiceAreaProps {
  value: ServiceAreaAvailabilityDraft;
  onChange: (next: ServiceAreaAvailabilityDraft) => void;
  onFinish: () => Promise<void>;
  onBack: () => void;
}

export function StepServiceArea({ value, onChange, onFinish, onBack }: StepServiceAreaProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function removeArea(tempId: string) {
    onChange({ ...value, areas: value.areas.filter((a) => a.tempId !== tempId) });
  }

  function addArea(area: AreaDraft) {
    onChange({ ...value, areas: [...value.areas, area] });
  }

  function toggleDay(dayIndex: number, enabled: boolean) {
    onChange({
      ...value,
      weekly: value.weekly.map((slot, i) => (i === dayIndex ? { ...slot, enabled } : slot)),
    });
  }

  function updateDayTime(dayIndex: number, patch: { startTime?: string; endTime?: string }) {
    onChange({
      ...value,
      weekly: value.weekly.map((slot, i) => (i === dayIndex ? { ...slot, ...patch } : slot)),
    });
  }

  async function handleFinish() {
    setFormError(null);

    if (value.areas.length === 0) {
      setFormError("Add at least one area you serve.");
      return;
    }
    if (!value.weekly.some((slot) => slot.enabled)) {
      setFormError("Turn on at least one day you're available.");
      return;
    }
    for (const slot of value.weekly) {
      if (!slot.enabled) continue;
      const parsed = weeklySlotSchema.safeParse({ dayOfWeek: 0, startTime: slot.startTime, endTime: slot.endTime });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? "Check your weekly hours.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onFinish();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Where and when can customers book you?</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
          Add the areas you serve and your usual weekly hours. You can fine-tune both later from your
          dashboard.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-ink-700">Your service area</p>
        {value.areas.length === 0 ? (
          <EmptyState
            icon={<MapPin size={20} aria-hidden />}
            title="No areas added yet"
            description="Add the cities or areas where you're available to work."
          />
        ) : (
          <ul className="mb-4 flex flex-wrap gap-2" aria-label="Areas you serve">
            {value.areas.map((area) => (
              <li key={area.tempId}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1.5 pl-3 pr-1.5 text-sm text-brand-700">
                  {[area.city, area.region, area.countryCode].filter(Boolean).join(", ")}
                  <button
                    type="button"
                    onClick={() => removeArea(area.tempId)}
                    aria-label={`Remove ${area.city}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <AddAreaForm onAdd={addArea} />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-ink-700">Weekly availability</p>
        <div className="flex flex-col divide-y divide-border-subtle rounded-lg border border-border-default">
          {DISPLAY_DAYS.map(({ index, label }) => {
            const slot = value.weekly[index];
            return (
              <div key={index} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="flex w-36 shrink-0 items-center gap-3">
                  <Switch checked={slot.enabled} onChange={(checked) => toggleDay(index, checked)} label={label} />
                  <span className="text-sm font-medium text-ink-900">{label}</span>
                </div>
                {slot.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`${label} start time`}
                      type="time"
                      className="w-32"
                      value={slot.startTime}
                      onChange={(e) => updateDayTime(index, { startTime: e.target.value })}
                    />
                    <span className="text-sm text-text-muted">to</span>
                    <Input
                      aria-label={`${label} end time`}
                      type="time"
                      className="w-32"
                      value={slot.endTime}
                      onChange={(e) => updateDayTime(index, { endTime: e.target.value })}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-text-muted">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-error">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" loading={submitting} onClick={() => void handleFinish()}>
          Finish setup
        </Button>
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} availability`}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-[var(--duration-fast)]",
        checked ? "bg-primary" : "bg-ink-200",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-fast)]",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

function AddAreaForm({ onAdd }: { onAdd: (area: AreaDraft) => void }) {
  const [countryCode, setCountryCode] = useState("US");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showPrecise, setShowPrecise] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusKm, setRadiusKm] = useState("10");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const raw = {
      countryCode,
      region: region.trim() || undefined,
      city,
      postalCode: postalCode.trim() || undefined,
      latitude: showPrecise && latitude.trim() !== "" ? latitude : undefined,
      longitude: showPrecise && longitude.trim() !== "" ? longitude : undefined,
      radiusKm: showPrecise && latitude.trim() !== "" && longitude.trim() !== "" ? radiusKm : undefined,
    };

    const parsed = createServiceAreaSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues as ZodIssue[]) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    onAdd({
      tempId: crypto.randomUUID(),
      countryCode: parsed.data.countryCode,
      region: parsed.data.region ?? "",
      city: parsed.data.city,
      postalCode: parsed.data.postalCode ?? "",
      latitude: parsed.data.latitude != null ? String(parsed.data.latitude) : "",
      longitude: parsed.data.longitude != null ? String(parsed.data.longitude) : "",
      radiusKm: parsed.data.radiusKm != null ? String(parsed.data.radiusKm) : "",
    });
    setCity("");
    setRegion("");
    setPostalCode("");
    setShowPrecise(false);
    setLatitude("");
    setLongitude("");
  }

  return (
    <Card className="p-5">
      <p className="mb-4 flex items-center gap-2 font-medium text-ink-900">
        <Plus size={16} aria-hidden />
        Add an area
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="City"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            errorText={fieldErrors.city}
            placeholder="e.g. Austin"
          />
          <Input
            label="Country code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            errorText={fieldErrors.countryCode}
            maxLength={2}
            placeholder="US"
          />
          <Input
            label="Region / state"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            errorText={fieldErrors.region}
            placeholder="Optional"
          />
          <Input
            label="Postal code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            errorText={fieldErrors.postalCode}
            placeholder="Optional"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPrecise((v) => !v)}
          className="self-start text-sm font-medium text-brand-700 hover:underline"
        >
          {showPrecise ? "Hide precise coverage radius" : "Set a precise coverage radius (optional)"}
        </button>

        {showPrecise ? (
          <div className="flex flex-col gap-3 rounded-md bg-surface-sunken p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                errorText={fieldErrors.latitude}
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                errorText={fieldErrors.longitude}
              />
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink-700">Service radius: {radiusKm} km</span>
              <input
                type="range"
                min={1}
                max={1000}
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                disabled={latitude.trim() === "" || longitude.trim() === ""}
                className="accent-[var(--color-primary)]"
              />
            </label>
            {fieldErrors.radiusKm ? <p className="text-xs text-error">{fieldErrors.radiusKm}</p> : null}
          </div>
        ) : null}

        <div>
          <Button type="submit" size="sm" variant="secondary">
            Add area
          </Button>
        </div>
      </form>
    </Card>
  );
}
