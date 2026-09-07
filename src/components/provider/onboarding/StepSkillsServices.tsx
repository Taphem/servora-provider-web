"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Search, Sparkles, Trash2, Wrench } from "lucide-react";
import type { ZodIssue } from "zod";
import { listCatalogServices, listCategories } from "@/lib/api/services";
import { createProviderServiceSchema } from "@/lib/validation/provider";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@/lib/currencies";
import type { CatalogService, Category } from "@/types/domain";
import type { ServiceDraft, SkillsServicesDraft } from "@/components/provider/onboarding/types";
import { RequirementsPreview } from "@/components/provider/onboarding/RequirementsPreview";
import { SkillsExpertise } from "@/components/provider/onboarding/SkillsExpertise";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";

type LoadStatus = "loading" | "ready" | "error";

interface StepSkillsServicesProps {
  value: SkillsServicesDraft;
  onChange: (next: SkillsServicesDraft) => void;
  onContinue: () => Promise<void>;
  onBack: () => void;
}

function PanelHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>
      </div>
      <h2 className="font-display text-h3 text-ink-900">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{description}</p>
    </div>
  );
}

export function StepSkillsServices({ value, onChange, onContinue, onBack }: StepSkillsServicesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [categoriesPage, servicesPage] = await Promise.all([
        listCategories({ pageSize: 100 }),
        listCatalogServices({ pageSize: 100 }),
      ]);
      setCategories(categoriesPage.data);
      setServices(servicesPage.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const draftByServiceId = useMemo(() => new Map(value.services.map((d) => [d.serviceId, d])), [value.services]);
  const selectedServiceIds = useMemo(() => new Set(value.services.map((d) => d.serviceId)), [value.services]);
  const popularServices = useMemo(() => services.filter((s) => !selectedServiceIds.has(s.id)).slice(0, 6), [services, selectedServiceIds]);

  function toggleService(serviceId: string) {
    const existing = draftByServiceId.get(serviceId);
    if (existing) {
      onChange({ ...value, services: value.services.filter((d) => d.serviceId !== serviceId) });
      if (activeServiceId === serviceId) setActiveServiceId(null);
    } else {
      const draft: ServiceDraft = { serviceId, priceAmount: "", priceCurrency: DEFAULT_CURRENCY, experienceYears: "", notes: "" };
      onChange({ ...value, services: [...value.services, draft] });
      setActiveServiceId(serviceId);
    }
  }

  function removeService(serviceId: string) {
    onChange({ ...value, services: value.services.filter((d) => d.serviceId !== serviceId) });
    if (activeServiceId === serviceId) setActiveServiceId(null);
  }

  function updateServiceDraft(serviceId: string, patch: Partial<ServiceDraft>) {
    onChange({
      ...value,
      services: value.services.map((d) => (d.serviceId === serviceId ? { ...d, ...patch } : d)),
    });
  }

  async function handleContinue() {
    setFormError(null);

    if (value.services.length === 0) {
      setFormError("Search for and select at least one service you're qualified to provide.");
      return;
    }

    const invalid = value.services.find((draft) => {
      const raw = {
        serviceId: draft.serviceId,
        priceAmount: draft.priceAmount.trim() === "" ? null : draft.priceAmount,
        priceCurrency: draft.priceAmount.trim() === "" ? null : draft.priceCurrency,
        experienceYears: draft.experienceYears.trim() === "" ? null : draft.experienceYears,
        notes: draft.notes.trim() || null,
      };
      return !createProviderServiceSchema.safeParse(raw).success;
    });
    if (invalid) {
      setActiveServiceId(invalid.serviceId);
      setFormError("Fix the highlighted service before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      await onContinue();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Step 2 of 3</p>
        <h1 className="font-display text-h2 text-ink-900">Build your professional offering</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
          Tell customers what they can book from you, and what you&apos;re especially good at.
        </p>
      </div>

      {status === "loading" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : status === "error" ? (
        <ErrorState
          description="Couldn't load the services catalog."
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <Card className="p-6 sm:p-7">
            <PanelHeading
              icon={<Wrench size={14} aria-hidden />}
              eyebrow="Services"
              title="What services do you offer?"
              description="Add the services customers can book from you."
            />

            <ServiceSearch
              services={services}
              categoryName={categoryName}
              selectedServiceIds={selectedServiceIds}
              onToggle={toggleService}
            />

            {value.services.length === 0 ? (
              <div className="mt-5 rounded-xl bg-surface-sunken p-5">
                <p className="font-medium text-ink-900">No services added yet</p>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                  Add the services you provide so customers know what they can book.
                </p>
                {popularServices.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Popular services</p>
                    <div className="flex flex-wrap gap-2">
                      {popularServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className="rounded-full border border-border-default bg-surface-raised px-3.5 py-1.5 text-sm text-ink-700 shadow-xs transition-colors hover:border-brand-300 hover:text-brand-700"
                        >
                          {service.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3">
                {value.services.map((draft) => (
                  <ServiceOfferingCard
                    key={draft.serviceId}
                    service={serviceById.get(draft.serviceId)}
                    categoryLabel={
                      serviceById.get(draft.serviceId)
                        ? (categoryName.get(serviceById.get(draft.serviceId)!.categoryId) ?? "")
                        : ""
                    }
                    draft={draft}
                    expanded={activeServiceId === draft.serviceId}
                    onToggleExpanded={() =>
                      setActiveServiceId((current) => (current === draft.serviceId ? null : draft.serviceId))
                    }
                    onChange={(patch) => updateServiceDraft(draft.serviceId, patch)}
                    onSaved={() => setActiveServiceId(null)}
                    onRemove={() => removeService(draft.serviceId)}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 sm:p-7">
            <PanelHeading
              icon={<Sparkles size={14} aria-hidden />}
              eyebrow="Expertise"
              title="Skills & expertise"
              description="What are you especially good at? This helps customers understand your strengths beyond the services you offer."
            />
            <SkillsExpertise value={value.skills} onChange={(skills) => onChange({ ...value, skills })} />
          </Card>
        </div>
      )}

      {formError ? (
        <p role="alert" className="text-sm text-error">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" loading={submitting} onClick={() => void handleContinue()}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function ServiceSearch({
  services,
  categoryName,
  selectedServiceIds,
  onToggle,
}: {
  services: CatalogService[];
  categoryName: Map<string, string>;
  selectedServiceIds: Set<string>;
  onToggle: (serviceId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? services.filter((s) => s.name.toLowerCase().includes(q)) : services;
    const byCategory = new Map<string, { name: string; services: CatalogService[] }>();
    for (const service of matches) {
      const name = categoryName.get(service.categoryId) ?? "Other services";
      const group = byCategory.get(service.categoryId) ?? { name, services: [] };
      group.services.push(service);
      byCategory.set(service.categoryId, group);
    }
    return Array.from(byCategory.values());
  }, [services, categoryName, query]);

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
        <input
          role="combobox"
          aria-label="Search services"
          aria-expanded={open}
          aria-controls="service-search-listbox"
          aria-autocomplete="list"
          value={query}
          placeholder="Search and add a service…"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className={cn(
            "h-12 w-full border bg-surface-raised pl-11 pr-11 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
            open ? "rounded-t-lg border-b-transparent" : "rounded-lg",
            "border-border-default hover:border-border-strong focus:border-primary",
          )}
        />
        <ArrowRight size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
      </div>

      {open ? (
        <div
          id="service-search-listbox"
          role="listbox"
          aria-label="Services"
          aria-multiselectable="true"
          className="absolute z-(--z-overlay) max-h-80 w-full overflow-y-auto rounded-b-lg border border-t border-border-default bg-surface-raised py-1 shadow-lg"
        >
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No services found.</p>
          ) : (
            groups.map((group, index) => (
              <div key={group.name} className={cn(index > 0 && "border-t border-border-subtle")}>
                <p className="px-4 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.name}</p>
                {group.services.map((service) => {
                  const selected = selectedServiceIds.has(service.id);
                  return (
                    <div
                      key={service.id}
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onToggle(service.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-ink-900 hover:bg-ink-50",
                        selected && "font-medium text-brand-700",
                      )}
                    >
                      <Check size={14} className={cn(selected ? "opacity-100" : "opacity-0")} aria-hidden />
                      {service.name}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ServiceOfferingCard({
  service,
  categoryLabel,
  draft,
  expanded,
  onToggleExpanded,
  onChange,
  onSaved,
  onRemove,
}: {
  service: CatalogService | undefined;
  categoryLabel: string;
  draft: ServiceDraft;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (patch: Partial<ServiceDraft>) => void;
  onSaved: () => void;
  onRemove: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasPrice = Boolean(draft.priceAmount && draft.priceCurrency);

  function handleSave() {
    const raw = {
      serviceId: draft.serviceId,
      priceAmount: draft.priceAmount.trim() === "" ? null : draft.priceAmount,
      priceCurrency: draft.priceAmount.trim() === "" ? null : draft.priceCurrency,
      experienceYears: draft.experienceYears.trim() === "" ? null : draft.experienceYears,
      notes: draft.notes.trim() || null,
    };
    const parsed = createProviderServiceSchema.safeParse(raw);
    if (!parsed.success) {
      const rowErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues as ZodIssue[]) {
        const key = String(issue.path[0]);
        if (!rowErrors[key]) rowErrors[key] = issue.message;
      }
      setErrors(rowErrors);
      return;
    }
    setErrors({});
    onSaved();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface-raised transition-colors",
        expanded ? "border-brand-300 shadow-sm" : "border-border-default",
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Sparkles size={14} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base text-ink-900">{service?.name ?? "Service"}</p>
            {categoryLabel ? <p className="mt-0.5 text-xs text-text-muted">{categoryLabel}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!expanded ? (
            <div className="mr-1 text-right">
              <p className="text-[0.65rem] uppercase tracking-wide text-text-muted">Starting price</p>
              <p className={cn("text-sm font-semibold", hasPrice ? "text-ink-900" : "text-text-muted")}>
                {hasPrice ? `${draft.priceCurrency} ${draft.priceAmount}` : "Not set"}
              </p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} aria-hidden />}
            onClick={onRemove}
            aria-label="Remove service"
          >
            <span className="sr-only">Remove</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} aria-hidden />}
            iconPosition="right"
            onClick={onToggleExpanded}
          >
            {expanded ? "Close" : "Edit"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-4 border-t border-border-subtle bg-surface-sunken/50 p-5">
          <div>
            <span className="text-sm font-medium text-ink-700">Your starting price</span>
            <div className="mt-1.5 flex gap-2">
              <Select
                aria-label="Currency"
                className="w-40 shrink-0"
                value={draft.priceCurrency}
                onChange={(e) => onChange({ priceCurrency: e.target.value })}
                options={CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: c.label }))}
              />
              <Input
                aria-label="Price amount"
                type="number"
                min={0}
                step="0.01"
                value={draft.priceAmount}
                onChange={(e) => onChange({ priceAmount: e.target.value })}
                errorText={errors.priceAmount}
                placeholder="Optional"
                className="flex-1"
              />
            </div>
          </div>

          <Input
            label="Experience"
            type="number"
            min={0}
            max={100}
            value={draft.experienceYears}
            onChange={(e) => onChange({ experienceYears: e.target.value })}
            errorText={errors.experienceYears}
            placeholder="Years of experience with this service"
            className="sm:max-w-xs"
          />

          <Input
            label="Notes"
            value={draft.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            errorText={errors.notes}
            placeholder="Tell customers about your expertise…"
          />

          {service ? <RequirementsPreview serviceIdOrSlug={service.slug} /> : null}

          <div>
            <Button type="button" size="sm" onClick={handleSave}>
              Save service
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
