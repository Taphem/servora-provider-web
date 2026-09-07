"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  createMyService,
  deleteMyService,
  listMyServices,
  updateMyService,
} from "@/lib/api/provider";
import { listCatalogServices } from "@/lib/api/services";
import { createProviderServiceSchema } from "@/lib/validation/provider";
import type { CatalogService, ProviderService } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

type LoadStatus = "loading" | "ready" | "error";

export function ServicesManager() {
  const [myServices, setMyServices] = useState<ProviderService[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [mine, catalogPage] = await Promise.all([
        listMyServices(),
        listCatalogServices({ pageSize: 100 }),
      ]);
      setMyServices(mine.data);
      setCatalog(catalogPage.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        description="Couldn't load your services."
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  const catalogById = new Map(catalog.map((s) => [s.id, s]));
  const offeredIds = new Set(myServices.map((s) => s.serviceId));
  const availableToAdd = catalog.filter((s) => !offeredIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      {myServices.length === 0 ? (
        <EmptyState
          title="You haven't added any services yet"
          description="Pick a service from the catalog below and set your own price."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {myServices.map((offering) => (
            <ServiceOfferingRow
              key={offering.id}
              offering={offering}
              catalogService={catalogById.get(offering.serviceId)}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {availableToAdd.length > 0 ? (
        <AddServiceForm catalogOptions={availableToAdd} onAdded={load} />
      ) : catalog.length > 0 ? (
        <p className="text-sm text-text-muted">You&apos;ve added every service in the catalog.</p>
      ) : (
        <p className="text-sm text-text-muted">The service catalog is currently empty.</p>
      )}
    </div>
  );
}

function ServiceOfferingRow({
  offering,
  catalogService,
  onChanged,
}: {
  offering: ProviderService;
  catalogService: CatalogService | undefined;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleEnabled() {
    setPending(true);
    setError(null);
    try {
      await updateMyService(offering.id, { isEnabled: !offering.isEnabled });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status >= 500 ? "We couldn't update this service. Please try again." : (err instanceof ApiError ? err.message : "Couldn't update this service."));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await deleteMyService(offering.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status >= 500 ? "We couldn't remove this service. Please try again." : (err instanceof ApiError ? err.message : "Couldn't remove this service."));
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink-900">{catalogService?.name ?? "Unknown service"}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {offering.priceAmount && offering.priceCurrency
              ? `${offering.priceCurrency} ${offering.priceAmount}`
              : "No price set"}
            {offering.experienceYears != null ? ` · ${offering.experienceYears} yrs experience` : ""}
          </p>
          {catalogService?.basePriceAmount && catalogService.basePriceCurrency ? (
            <p className="mt-0.5 text-xs text-text-muted">
              Catalog reference price: {catalogService.basePriceCurrency} {catalogService.basePriceAmount}{" "}
              (not your price)
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={offering.isEnabled ? "success" : "neutral"}>
            {offering.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
          <Button variant="secondary" size="sm" loading={pending} onClick={() => void toggleEnabled()}>
            {offering.isEnabled ? "Disable" : "Enable"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} aria-hidden />}
            onClick={() => void remove()}
            aria-label="Remove service"
          >
            <span className="sr-only sm:not-sr-only">Remove</span>
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function AddServiceForm({
  catalogOptions,
  onAdded,
}: {
  catalogOptions: CatalogService[];
  onAdded: () => void;
}) {
  const [serviceId, setServiceId] = useState(catalogOptions[0]?.id ?? "");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [experienceYears, setExperienceYears] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const raw = {
      serviceId,
      priceAmount: priceAmount.trim() === "" ? null : priceAmount,
      priceCurrency: priceAmount.trim() === "" ? null : priceCurrency,
      experienceYears: experienceYears.trim() === "" ? null : experienceYears,
      notes: notes.trim() || null,
    };

    const parsed = createProviderServiceSchema.safeParse(raw);
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
      await createMyService(parsed.data);
      setPriceAmount("");
      setExperienceYears("");
      setNotes("");
      onAdded();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError("This service has already been added.");
      } else {
        setFormError("We couldn't save this service. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <p className="mb-4 flex items-center gap-2 font-medium text-ink-900">
        <Plus size={16} aria-hidden />
        Add a service
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Select
          label="Service"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          errorText={fieldErrors.serviceId}
          options={catalogOptions.map((s) => ({ value: s.id, label: s.name }))}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Your price"
            type="number"
            min={0}
            step="0.01"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            errorText={fieldErrors.priceAmount}
            placeholder="Optional"
          />
          <Input
            label="Currency"
            value={priceCurrency}
            onChange={(e) => setPriceCurrency(e.target.value)}
            errorText={fieldErrors.priceCurrency}
            maxLength={3}
          />
          <Input
            label="Experience (years)"
            type="number"
            min={0}
            max={100}
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
            errorText={fieldErrors.experienceYears}
            placeholder="Optional"
          />
        </div>
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          errorText={fieldErrors.notes}
          placeholder="Optional"
        />
        {formError ? (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        ) : null}
        <div>
          <Button type="submit" size="sm" loading={submitting}>
            Add service
          </Button>
        </div>
      </form>
    </Card>
  );
}
