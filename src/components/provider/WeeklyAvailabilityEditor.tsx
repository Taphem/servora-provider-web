"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { listMyWeeklyAvailability, replaceMyWeeklyAvailability } from "@/lib/api/provider";
import { weeklySlotSchema } from "@/lib/validation/provider";
import type { WeeklyAvailabilitySlotInput } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type LoadStatus = "loading" | "ready" | "error";

export function WeeklyAvailabilityEditor() {
  const [slots, setSlots] = useState<WeeklyAvailabilitySlotInput[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await listMyWeeklyAvailability();
      setSlots(result.data.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })));
      setDirty(false);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function addRow() {
    setSlots((prev) => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
    setDirty(true);
  }

  function updateRow(index: number, patch: Partial<WeeklyAvailabilitySlotInput>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
    setDirty(true);
  }

  function removeRow(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function save() {
    setFormError(null);
    const errors: Record<number, string> = {};
    slots.forEach((slot, i) => {
      const parsed = weeklySlotSchema.safeParse(slot);
      if (!parsed.success) errors[i] = parsed.error.issues[0]?.message ?? "Invalid slot";
    });
    if (Object.keys(errors).length > 0) {
      setRowErrors(errors);
      return;
    }
    setRowErrors({});
    setSaving(true);
    try {
      await replaceMyWeeklyAvailability(slots);
      setDirty(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save your weekly schedule.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <Skeleton className="h-48 w-full" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        description="Couldn't load your weekly availability."
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {slots.length === 0 ? (
        <EmptyState title="No weekly hours set" description="Add the days and hours you're generally available." />
      ) : (
        <div className="flex flex-col gap-3">
          {slots.map((slot, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border-default p-3 sm:flex-row sm:items-center">
              <Select
                aria-label="Day of week"
                className="sm:w-40"
                value={String(slot.dayOfWeek)}
                onChange={(e) => updateRow(i, { dayOfWeek: Number(e.target.value) })}
                options={dayLabels.map((label, day) => ({ value: String(day), label }))}
              />
              <Input
                aria-label="Start time"
                type="time"
                className="sm:w-32"
                value={slot.startTime}
                onChange={(e) => updateRow(i, { startTime: e.target.value })}
              />
              <span className="text-sm text-text-muted">to</span>
              <Input
                aria-label="End time"
                type="time"
                className="sm:w-32"
                value={slot.endTime}
                onChange={(e) => updateRow(i, { endTime: e.target.value })}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} aria-hidden />}
                onClick={() => removeRow(i)}
                aria-label="Remove slot"
                className="sm:ml-auto"
              >
                <span className="sr-only sm:not-sr-only">Remove</span>
              </Button>
              {rowErrors[i] ? <p className="text-xs text-error sm:basis-full">{rowErrors[i]}</p> : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" icon={<Plus size={14} aria-hidden />} onClick={addRow}>
          Add time slot
        </Button>
        <Button size="sm" loading={saving} disabled={!dirty} onClick={() => void save()}>
          Save weekly schedule
        </Button>
      </div>
      {formError ? (
        <p role="alert" className="text-sm text-error">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
