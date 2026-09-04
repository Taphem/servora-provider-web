"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  deleteMyAvailabilityOverride,
  listMyAvailabilityOverrides,
  upsertMyAvailabilityOverride,
} from "@/lib/api/provider";
import { availabilityOverrideSchema } from "@/lib/validation/provider";
import type { AvailabilityDateOverride } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

type LoadStatus = "loading" | "ready" | "error";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DateOverrideEditor() {
  const [overrides, setOverrides] = useState<AvailabilityDateOverride[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const from = todayIso();
  const to = addDaysIso(60);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await listMyAvailabilityOverrides({ from, to });
      setOverrides(result.data.slice().sort((a, b) => a.overrideDate.localeCompare(b.overrideDate)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (status === "loading") {
    return <Skeleton className="h-40 w-full" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        description="Couldn't load your date overrides."
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
      <p className="text-sm text-text-muted">Showing overrides from {from} to {to}.</p>
      {overrides.length === 0 ? (
        <EmptyState
          title="No date overrides"
          description="Mark specific dates as unavailable, or set different hours than your usual weekly schedule."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {overrides.map((override) => (
            <OverrideRow key={override.id} override={override} onRemoved={load} />
          ))}
        </div>
      )}
      <AddOverrideForm minDate={from} maxDate={to} onSaved={load} />
    </div>
  );
}

function OverrideRow({
  override,
  onRemoved,
}: {
  override: AvailabilityDateOverride;
  onRemoved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await deleteMyAvailabilityOverride(override.overrideDate);
      onRemoved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove this override.");
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-900">
          <span className="font-medium">{override.overrideDate}</span> —{" "}
          {override.isUnavailable ? "Unavailable" : `${override.startTime} to ${override.endTime}`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          icon={<Trash2 size={14} aria-hidden />}
          onClick={() => void remove()}
          aria-label="Remove override"
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

function AddOverrideForm({
  minDate,
  maxDate,
  onSaved,
}: {
  minDate: string;
  maxDate: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(minDate);
  const [isUnavailable, setIsUnavailable] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const raw = {
      isUnavailable,
      startTime: isUnavailable ? undefined : startTime,
      endTime: isUnavailable ? undefined : endTime,
    };

    const parsed = availabilityOverrideSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    if (!date) {
      setFieldErrors({ date: "Choose a date" });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await upsertMyAvailabilityOverride(date, parsed.data);
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this override.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <p className="mb-4 flex items-center gap-2 font-medium text-ink-900">
        <Plus size={16} aria-hidden />
        Add a date override
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Date"
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          errorText={fieldErrors.date}
        />
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={isUnavailable}
            onChange={(e) => setIsUnavailable(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong"
          />
          Mark this date fully unavailable
        </label>
        {!isUnavailable ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              errorText={fieldErrors.startTime}
            />
            <Input
              label="End time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              errorText={fieldErrors.endTime}
            />
          </div>
        ) : null}
        {formError ? (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        ) : null}
        <div>
          <Button type="submit" size="sm" loading={submitting}>
            Save override
          </Button>
        </div>
      </form>
    </Card>
  );
}
