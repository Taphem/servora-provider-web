"use client";

import { useState } from "react";
import { MapPin, Navigation, X, AlertCircle } from "lucide-react";
import { weeklySlotSchema } from "@/lib/validation/provider";
import type { AreaDraft, ServiceAreaAvailabilityDraft } from "@/components/provider/onboarding/types";
import { PlaceAutocomplete, type SelectedPlace } from "@/components/provider/onboarding/PlaceAutocomplete";
import { GoogleMap, type MapLocationUpdate } from "@/components/provider/onboarding/GoogleMap";
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
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [defaultRadiusKm, setDefaultRadiusKm] = useState("15");

  // Primary active location for map centering
  const activeArea = value.areas[value.areas.length - 1];
  const mapCenter = {
    lat: activeArea?.latitude ? Number(activeArea.latitude) : 12.9716, // Default to Bengaluru or active
    lng: activeArea?.longitude ? Number(activeArea.longitude) : 77.5946,
  };

  function removeArea(tempId: string) {
    onChange({ ...value, areas: value.areas.filter((a) => a.tempId !== tempId) });
  }

  function addAreaFromPlace(place: SelectedPlace) {
    setLocationError(null);
    const newArea: AreaDraft = {
      tempId: crypto.randomUUID(),
      countryCode: place.countryCode,
      region: place.region,
      city: place.city,
      postalCode: place.postalCode,
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      radiusKm: defaultRadiusKm,
      formattedAddress: place.formattedAddress,
      placeId: place.placeId,
    };

    // Keep unique areas by city & postal code
    const existingIndex = value.areas.findIndex(
      (a) => a.city.toLowerCase() === newArea.city.toLowerCase() && a.countryCode === newArea.countryCode,
    );

    if (existingIndex >= 0) {
      const updated = [...value.areas];
      updated[existingIndex] = { ...updated[existingIndex], ...newArea };
      onChange({ ...value, areas: updated });
    } else {
      onChange({ ...value, areas: [...value.areas, newArea] });
    }
  }

  function handleMapClick(update: MapLocationUpdate) {
    setLocationError(null);
    const newArea: AreaDraft = {
      tempId: crypto.randomUUID(),
      countryCode: update.countryCode || "IN",
      region: update.region || "",
      city: update.city || "Selected location",
      postalCode: update.postalCode || "",
      latitude: String(update.latitude),
      longitude: String(update.longitude),
      radiusKm: defaultRadiusKm,
      formattedAddress: update.formattedAddress,
    };

    if (value.areas.length > 0) {
      // Replace the active location on map click to refine
      const updated = [...value.areas];
      updated[updated.length - 1] = newArea;
      onChange({ ...value, areas: updated });
    } else {
      onChange({ ...value, areas: [newArea] });
    }
  }

  function handleCurrentLocation() {
    setLocationError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        let formattedAddress = "Current Location";
        let countryCode = "IN";
        let region = "";
        let city = "My City";
        let postalCode = "";

        // Attempt reverse geocode via window.google if available
        try {
          const g = typeof window !== "undefined" ? window.google : undefined;
          if (g?.maps?.Geocoder) {
            const geocoder = new g.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response?.results?.[0]) {
              const res = response.results[0];
              formattedAddress = res.formatted_address;
              for (const comp of res.address_components || []) {
                const types: string[] = comp.types || [];
                if (types.includes("country")) countryCode = comp.short_name;
                else if (types.includes("administrative_area_level_1")) region = comp.long_name;
                else if (types.includes("locality") || types.includes("sublocality")) {
                  if (!city || city === "My City") city = comp.long_name;
                } else if (types.includes("postal_code")) postalCode = comp.short_name;
              }
            }
          }
        } catch (err) {
          console.warn("Reverse geocode failed for current location:", err);
        }

        setLocating(false);
        addAreaFromPlace({
          formattedAddress,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          countryCode,
          region,
          city,
          postalCode,
        });
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission was denied. You can search your area manually above.");
        } else {
          setLocationError("Couldn't retrieve current location. Please search manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function updateRadius(tempId: string, radius: string) {
    setDefaultRadiusKm(radius);
    onChange({
      ...value,
      areas: value.areas.map((a) => (a.tempId === tempId ? { ...a, radiusKm: radius } : a)),
    });
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
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Customers will use this to find providers who serve their area. Search for your service area,
          pinpoint it on the map, and set your weekly availability.
        </p>
      </div>

      {/* Main Two-Column Layout (Desktop Side-by-Side, Mobile Stacked) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Search, Current Location, Selected Location, Manual Form */}
        <div className="flex flex-col gap-5 lg:col-span-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Find your service area</h2>
            <PlaceAutocomplete onSelectPlace={addAreaFromPlace} />

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted">Or find where you are right now:</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Navigation size={13} aria-hidden />}
                onClick={handleCurrentLocation}
                loading={locating}
              >
                Use my current location
              </Button>
            </div>

            {locationError ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-error-50 p-2.5 text-xs text-error">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{locationError}</span>
              </div>
            ) : null}
          </Card>

          {/* Selected Areas / Active Location Card */}
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Selected service areas</p>
            {value.areas.length === 0 ? (
              <EmptyState
                icon={<MapPin size={20} aria-hidden />}
                title="No areas selected yet"
                description="Search for a place above or click on the map to set where you serve customers."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {value.areas.map((area) => (
                  <Card key={area.tempId} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                          <MapPin size={14} aria-hidden />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ink-900">
                            {area.formattedAddress || [area.city, area.region, area.countryCode].filter(Boolean).join(", ")}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-text-muted">
                            <span className="rounded-md bg-ink-100 px-2 py-0.5 font-medium text-ink-700">
                              {area.city}
                            </span>
                            {area.region ? (
                              <span className="rounded-md bg-ink-50 px-2 py-0.5">{area.region}</span>
                            ) : null}
                            <span className="rounded-md bg-ink-50 px-2 py-0.5 uppercase">{area.countryCode}</span>
                            {area.latitude && area.longitude ? (
                              <span className="text-text-muted">
                                ({Number(area.latitude).toFixed(4)}, {Number(area.longitude).toFixed(4)})
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeArea(area.tempId)}
                        aria-label={`Remove ${area.city}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </div>

                    {/* Coverage Radius Slider */}
                    <div className="border-t border-border-subtle pt-3">
                      <div className="flex items-center justify-between text-xs font-medium text-ink-700">
                        <span>Service coverage radius</span>
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                          {area.radiusKm || defaultRadiusKm} km
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={area.radiusKm || defaultRadiusKm}
                        onChange={(e) => updateRadius(area.tempId, e.target.value)}
                        className="mt-2 w-full accent-[var(--color-primary)]"
                        aria-label="Coverage radius"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick manual address form fallback for backwards compatibility & tests */}
          <AddAreaManualForm onAdd={(newArea) => onChange({ ...value, areas: [...value.areas, newArea] })} />
        </div>

        {/* Right Column: Interactive Google Map */}
        <div className="flex flex-col gap-3 lg:col-span-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-700">Interactive Map</span>
            <span className="text-xs text-text-muted">Click anywhere to reposition</span>
          </div>
          <GoogleMap
            center={mapCenter}
            zoom={activeArea?.latitude ? 13 : 11}
            markerTitle={activeArea?.formattedAddress || activeArea?.city || "Service location"}
            onLocationClick={handleMapClick}
            className="h-[460px] min-h-[460px]"
          />
        </div>
      </div>

      {/* Weekly Availability Section */}
      <div>
        <h2 className="mb-1 font-display text-h3 text-ink-900">Weekly availability</h2>
        <p className="mb-4 text-sm text-text-secondary">
          Turn on the days of the week you are available for customer bookings.
        </p>
        <div className="flex flex-col divide-y divide-border-subtle rounded-lg border border-border-default bg-surface-raised">
          {DISPLAY_DAYS.map(({ index, label }) => {
            const slot = value.weekly[index];
            return (
              <div key={index} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
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

      <div className="flex justify-between border-t border-border-subtle pt-4">
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
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-[var(--duration-fast)]",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

function AddAreaManualForm({ onAdd }: { onAdd: (area: AreaDraft) => void }) {
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [showPrecise, setShowPrecise] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusKm, setRadiusKm] = useState("10");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!showManual) {
    return (
      <button
        type="button"
        onClick={() => setShowManual(true)}
        className="self-start text-xs font-medium text-brand-700 hover:underline"
      >
        + Add an area manually without search
      </button>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!city.trim()) {
      setFieldErrors({ city: "City is required" });
      return;
    }

    onAdd({
      tempId: crypto.randomUUID(),
      countryCode: countryCode.toUpperCase().slice(0, 2),
      region: region.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      latitude: showPrecise && latitude.trim() !== "" ? latitude : "",
      longitude: showPrecise && longitude.trim() !== "" ? longitude : "",
      radiusKm: showPrecise && latitude.trim() !== "" && longitude.trim() !== "" ? radiusKm : "",
    });

    setCity("");
    setRegion("");
    setPostalCode("");
    setLatitude("");
    setLongitude("");
    setShowManual(false);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-900">Add area details manually</p>
        <button
          type="button"
          onClick={() => setShowManual(false)}
          className="text-xs text-text-muted hover:text-ink-900"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
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
            maxLength={2}
            placeholder="US"
          />
          <Input
            label="Region / state"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Postal code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPrecise((v) => !v)}
          className="self-start text-xs font-medium text-brand-700 hover:underline"
        >
          {showPrecise ? "Hide precise coverage radius" : "Set a precise coverage radius (optional)"}
        </button>

        {showPrecise ? (
          <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-2.5">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-ink-700">Service radius: {radiusKm} km</span>
              <input
                type="range"
                min={1}
                max={100}
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                disabled={latitude.trim() === "" || longitude.trim() === ""}
                className="accent-[var(--color-primary)]"
              />
            </label>
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
