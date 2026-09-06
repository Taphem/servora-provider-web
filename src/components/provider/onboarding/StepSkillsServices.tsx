"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const servicesByCategory = useMemo(() => {
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const groups = new Map<string, { name: string; services: CatalogService[] }>();
    for (const service of services) {
      const name = categoryName.get(service.categoryId) ?? "Other services";
      const group = groups.get(service.categoryId) ?? { name, services: [] };
      group.services.push(service);
      groups.set(service.categoryId, group);
    }
    return Array.from(groups.values());
  }, [categories, services]);

  const draftByServiceId = useMemo(() => new Map(value.services.map((d) => [d.serviceId, d])), [value.services]);

  function toggleSkill(skillId: string) {
    const has = value.skillIds.includes(skillId);
    onChange({ ...value, skillIds: has ? value.skillIds.filter((id) => id !== skillId) : [...value.skillIds, skillId] });
  }

  function toggleService(serviceId: string) {
    const existing = draftByServiceId.get(serviceId);
    if (existing) {
      onChange({ ...value, services: value.services.filter((d) => d.serviceId !== serviceId) });
    } else {
      const draft: ServiceDraft = { serviceId, priceAmount: "", priceCurrency: "USD", experienceYears: "", notes: "" };
      onChange({ ...value, services: [...value.services, draft] });
    }
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
      setFormError("Select at least one service you're qualified to provide.");
      return;
    }

    const errors: Record<string, Record<string, string>> = {};
    for (const draft of value.services) {
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
        errors[draft.serviceId] = rowErrors;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Fix the highlighted services before continuing.");
      return;
    }

    setFieldErrors({});
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
          Choose the services you&apos;re qualified to provide. You set your own price for each one —
          it&apos;s independent of the catalog&apos;s reference price.
        </p>
      </div>

      {status === "loading" ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
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

          {servicesByCategory.length === 0 ? (
            <EmptyState title="No services available yet" description="The service catalog is currently empty." />
          ) : (
            <div className="flex flex-col gap-6">
              {servicesByCategory.map((group) => (
                <div key={group.name}>
                  <p className="mb-2 text-sm font-medium text-ink-700">{group.name}</p>
                  <div className="flex flex-col gap-2">
                    {group.services.map((service) => {
                      const draft = draftByServiceId.get(service.id);
                      const rowErrors = fieldErrors[service.id] ?? {};
                      return (
                        <Card key={service.id} className={cn("p-4", draft && "border-brand-200")}>
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(draft)}
                              onChange={() => toggleService(service.id)}
                              className="mt-0.5 h-4 w-4 rounded border-border-strong"
                            />
                            <span>
                              <span className="font-medium text-ink-900">{service.name}</span>
                              {service.description ? (
                                <span className="block text-sm text-text-secondary">{service.description}</span>
                              ) : null}
                            </span>
                          </label>

                          {draft ? (
                            <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <Input
                                  label="Your price"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={draft.priceAmount}
                                  onChange={(e) => updateServiceDraft(service.id, { priceAmount: e.target.value })}
                                  errorText={rowErrors.priceAmount}
                                  placeholder="Optional"
                                />
                                <Input
                                  label="Currency"
                                  value={draft.priceCurrency}
                                  onChange={(e) => updateServiceDraft(service.id, { priceCurrency: e.target.value })}
                                  errorText={rowErrors.priceCurrency}
                                  maxLength={3}
                                />
                                <Input
                                  label="Experience (years)"
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={draft.experienceYears}
                                  onChange={(e) => updateServiceDraft(service.id, { experienceYears: e.target.value })}
                                  errorText={rowErrors.experienceYears}
                                  placeholder="Optional"
                                />
                              </div>
                              <Input
                                label="Notes for customers"
                                value={draft.notes}
                                onChange={(e) => updateServiceDraft(service.id, { notes: e.target.value })}
                                errorText={rowErrors.notes}
                                placeholder="Optional — e.g. equipment you bring, specialties"
                              />
                              <RequirementsPreview serviceIdOrSlug={service.slug} />
                            </div>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
