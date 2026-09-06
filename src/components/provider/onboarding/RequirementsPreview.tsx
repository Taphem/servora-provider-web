"use client";

import { useEffect, useState } from "react";
import { AlignLeft, Calendar, CheckSquare, Clock, Hash, List, ToggleLeft, Type } from "lucide-react";
import { getServiceRequirements } from "@/lib/api/services";
import type { RequirementField, RequirementFieldType } from "@/types/domain";
import { Spinner } from "@/components/ui/Spinner";

const typeIcon: Record<RequirementFieldType, typeof Type> = {
  TEXT: Type,
  TEXTAREA: AlignLeft,
  SELECT: List,
  MULTISELECT: CheckSquare,
  NUMBER: Hash,
  BOOLEAN: ToggleLeft,
  DATE: Calendar,
  TIME: Clock,
};

const typeLabel: Record<RequirementFieldType, string> = {
  TEXT: "Short answer",
  TEXTAREA: "Long answer",
  SELECT: "Choose one",
  MULTISELECT: "Choose multiple",
  NUMBER: "Number",
  BOOLEAN: "Yes / No",
  DATE: "Date",
  TIME: "Time",
};

/**
 * Read-only preview of what a customer will be asked when booking this
 * service, sourced live from servora-services' own requirements endpoint.
 * These fields belong to the booking-request form (service_requirement_fields
 * in servora-services), not to a provider's qualifications — servora-provider
 * has no column to store a provider's own answers to them, so this is
 * informational only, never an editable form.
 */
export function RequirementsPreview({ serviceIdOrSlug }: { serviceIdOrSlug: string }) {
  const [fields, setFields] = useState<RequirementField[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void getServiceRequirements(serviceIdOrSlug)
        .then((result) => {
          if (!cancelled) setFields(result.fields.slice().sort((a, b) => a.displayOrder - b.displayOrder));
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [serviceIdOrSlug]);

  if (error) return null;

  if (fields === null) {
    return (
      <p className="flex items-center gap-2 text-xs text-text-muted">
        <Spinner size={12} /> Checking what customers will be asked…
      </p>
    );
  }

  if (fields.length === 0) return null;

  return (
    <div className="rounded-md border border-border-subtle bg-surface-sunken p-3">
      <p className="text-xs font-medium text-ink-700">Customers booking this service will be asked for:</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {fields.map((field) => {
          const Icon = typeIcon[field.fieldType];
          return (
            <li key={field.id} className="flex items-center gap-2 text-xs text-text-secondary">
              <Icon size={13} className="shrink-0 text-ink-400" aria-hidden />
              <span>
                {field.label}
                {field.isRequired ? <span className="text-error"> *</span> : null}
              </span>
              <span className="text-text-muted">— {typeLabel[field.fieldType]}</span>
              {(field.fieldType === "SELECT" || field.fieldType === "MULTISELECT") && field.options.length > 0 ? (
                <span className="text-text-muted">({field.options.map((o) => o.label).join(", ")})</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
