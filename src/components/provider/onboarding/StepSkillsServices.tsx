"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import type { ZodIssue } from "zod";
import { listSkillsCatalog } from "@/lib/api/provider";
import { listCatalogServices, listCategories } from "@/lib/api/services";
import { createProviderServiceSchema } from "@/lib/validation/provider";
import type { CatalogService, Category, Skill } from "@/types/domain";
import type { ServiceDraft, SkillsServicesDraft } from "@/components/provider/onboarding/types";
import { RequirementsPreview } from "@/components/provider/onboarding/RequirementsPreview";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

export function StepSkillsServices({ value, onChange, onContinue, onBack }: StepSkillsServicesProps) {
  const [skillsCatalog, setSkillsCatalog] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [skillsPage, categoriesPage, servicesPage] = await Promise.all([
        listSkillsCatalog({ pageSize: 100 }),
        listCategories({ pageSize: 100 }),
        listCatalogServices({ pageSize: 100 }),
      ]);
      setSkillsCatalog(skillsPage.data);
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

  function toggleSkill(skillId: string) {
    const has = value.skillIds.includes(skillId);
    onChange({ ...value, skillIds: has ? value.skillIds.filter((id) => id !== skillId) : [...value.skillIds, skillId] });
  }

  function toggleService(serviceId: string) {
    const existing = draftByServiceId.get(serviceId);
    if (existing) {
      onChange({ ...value, services: value.services.filter((d) => d.serviceId !== serviceId) });
      if (activeServiceId === serviceId) setActiveServiceId(null);
    } else {
      const draft: ServiceDraft = { serviceId, priceAmount: "", priceCurrency: "USD", experienceYears: "", notes: "" };
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-h2 text-ink-900">What do you do?</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
          Search for the services you&apos;re qualified to provide. You set your own price for each one
          — it&apos;s independent of the catalog&apos;s reference price.
        </p>
      </div>

      {status === "loading" ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-11 w-full max-w-sm" />
          <Skeleton className="h-24 w-full" />
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
        <>
          {skillsCatalog.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skillsCatalog.map((skill) => {
                  const active = value.skillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSkill(skill.id)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-border-default bg-surface-raised text-ink-600 hover:border-border-strong",
                      )}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Search for a service you provide</p>
            <ServiceSearch
              services={services}
              categoryName={categoryName}
              selectedServiceIds={new Set(value.services.map((d) => d.serviceId))}
              onToggle={toggleService}
            />

            {value.services.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Selected services">
                {value.services.map((draft) => {
                  const service = serviceById.get(draft.serviceId);
                  return (
                    <li key={draft.serviceId}>
                      <button
                        type="button"
                        onClick={() => setActiveServiceId(draft.serviceId)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 text-sm transition-colors",
                          activeServiceId === draft.serviceId
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-border-default bg-surface-raised text-ink-700 hover:border-border-strong",
                        )}
                      >
                        {service?.name ?? "Service"}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeService(draft.serviceId);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.stopPropagation();
                              event.preventDefault();
                              removeService(draft.serviceId);
                            }
                          }}
                          aria-label={`Remove ${service?.name ?? "service"}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-100"
                        >
                          <X size={12} aria-hidden />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          {activeServiceId && draftByServiceId.get(activeServiceId) ? (
            <ServiceConfigPanel
              service={serviceById.get(activeServiceId)}
              categoryLabel={
                serviceById.get(activeServiceId)
                  ? (categoryName.get(serviceById.get(activeServiceId)!.categoryId) ?? "")
                  : ""
              }
              draft={draftByServiceId.get(activeServiceId)!}
              onChange={(patch) => updateServiceDraft(activeServiceId, patch)}
              onDone={() => setActiveServiceId(null)}
              onRemove={() => removeService(activeServiceId)}
            />
          ) : null}

          {value.services.filter((d) => d.serviceId !== activeServiceId).length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Your services</p>
              <div className="flex flex-col gap-2">
                {value.services
                  .filter((d) => d.serviceId !== activeServiceId)
                  .map((draft) => {
                    const service = serviceById.get(draft.serviceId);
                    return (
                      <Card key={draft.serviceId} className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium text-ink-900">{service?.name ?? "Service"}</p>
                          <p className="text-xs text-text-muted">
                            {service ? categoryName.get(service.categoryId) : ""}
                            {draft.experienceYears ? ` · ${draft.experienceYears} yrs experience` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {draft.priceAmount && draft.priceCurrency ? (
                            <span className="text-sm font-medium text-ink-900">
                              {draft.priceCurrency} {draft.priceAmount}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">No price set</span>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Pencil size={13} aria-hidden />}
                            onClick={() => setActiveServiceId(draft.serviceId)}
                          >
                            Edit
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </>
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
  const inputRef = useRef<HTMLInputElement>(null);
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
    <div ref={rootRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="service-search-listbox"
          aria-autocomplete="list"
          value={query}
          placeholder="Search services…"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className={cn(
            "h-11 w-full border bg-surface-raised pl-10 pr-4 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
            open ? "rounded-t-md border-b-transparent" : "rounded-md",
            "border-border-default hover:border-border-strong focus:border-primary",
          )}
        />
      </div>

      {open ? (
        <div
          id="service-search-listbox"
          role="listbox"
          aria-label="Services"
          aria-multiselectable="true"
          className="absolute z-(--z-overlay) max-h-72 w-full overflow-y-auto rounded-b-md border border-t border-border-default bg-surface-raised py-1 shadow-lg"
        >
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No services found.</p>
          ) : (
            groups.map((group) => (
              <div key={group.name}>
                <p className="px-4 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.name}</p>
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
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-ink-900 hover:bg-ink-50",
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

function ServiceConfigPanel({
  service,
  categoryLabel,
  draft,
  onChange,
  onDone,
  onRemove,
}: {
  service: CatalogService | undefined;
  categoryLabel: string;
  draft: ServiceDraft;
  onChange: (patch: Partial<ServiceDraft>) => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    onDone();
  }

  return (
    <Card className="flex flex-col gap-4 border-brand-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink-900">{service?.name ?? "Service"}</p>
          {categoryLabel ? <p className="text-xs text-text-muted">{categoryLabel}</p> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} aria-hidden />}
          onClick={onRemove}
          aria-label="Remove this service"
        >
          <span className="sr-only sm:not-sr-only">Remove</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Your price</span>
          <div className="flex gap-2">
            <Input
              aria-label="Currency"
              className="w-20 shrink-0"
              value={draft.priceCurrency}
              onChange={(e) => onChange({ priceCurrency: e.target.value })}
              maxLength={3}
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
            />
          </div>
        </div>
        <Input
          label="Experience (years)"
          type="number"
          min={0}
          max={100}
          value={draft.experienceYears}
          onChange={(e) => onChange({ experienceYears: e.target.value })}
          errorText={errors.experienceYears}
          placeholder="Optional"
        />
        <Input
          label="Additional notes"
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          errorText={errors.notes}
          placeholder="Tell customers about your expertise…"
        />
      </div>

      {service ? <RequirementsPreview serviceIdOrSlug={service.slug} /> : null}

      <div>
        <Button type="button" size="sm" onClick={handleSave}>
          Save service
        </Button>
      </div>
    </Card>
  );
}
