"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2, Plus, MapPin } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { createMyServiceArea, deleteMyServiceArea, listMyServiceAreas } from "@/lib/api/provider";
import { createServiceAreaSchema } from "@/lib/validation/provider";
import type { ServiceArea } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

type LoadStatus = "loading" | "ready" | "error";

export function ServiceAreaManager() {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await listMyServiceAreas();
      setAreas(result.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (status === "loading") {
    return <Skeleton className="h-32 w-full" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        description="Couldn't load your service areas."
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {areas.length === 0 ? (
        <EmptyState
          icon={<MapPin size={20} aria-hidden />}
          title="No service areas yet"
          description="Add the cities or regions where you're available to work."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {areas.map((area) => (
            <AreaRow key={area.id} area={area} onRemoved={load} />
          ))}
        </div>
      )}
      <AddAreaForm onAdded={load} />
    </div>
  );
}

function AreaRow({ area, onRemoved }: { area: ServiceArea; onRemoved: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await deleteMyServiceArea(area.id);
      onRemoved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove this area.");
      setPending(false);
    }
  }

  const parts = [area.city, area.region, area.countryCode].filter(Boolean);

  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-900">
          {parts.join(", ")}
          {area.postalCode ? ` · ${area.postalCode}` : ""}
          {area.radiusKm ? ` · ${area.radiusKm} km radius` : ""}
        </p>
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          icon={<Trash2 size={14} aria-hidden />}
          onClick={() => void remove()}
          aria-label="Remove service area"
        >
          <span className="sr-only sm:not-sr-only">Remove</span>
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function AddAreaForm({ onAdded }: { onAdded: () => void }) {
  const [countryCode, setCountryCode] = useState("US");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const raw = {
      countryCode,
      region: region.trim() || undefined,
      city,
      postalCode: postalCode.trim() || undefined,
    };

    const parsed = createServiceAreaSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await createMyServiceArea(parsed.data);
      setRegion("");
      setCity("");
      setPostalCode("");
      onAdded();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't add this service area.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <p className="mb-4 flex items-center gap-2 font-medium text-ink-900">
        <Plus size={16} aria-hidden />
        Add a service area
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} errorText={fieldErrors.city} required />
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
        {formError ? (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        ) : null}
        <div>
          <Button type="submit" size="sm" loading={submitting}>
            Add area
          </Button>
        </div>
      </form>
    </Card>
  );
}
