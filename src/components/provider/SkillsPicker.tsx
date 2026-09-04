"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listSkillsCatalog, listMySkills, replaceMySkills } from "@/lib/api/provider";
import type { Skill } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

type LoadStatus = "loading" | "ready" | "error";

export function SkillsPicker() {
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [catalogPage, mine] = await Promise.all([
        listSkillsCatalog({ pageSize: 100 }),
        listMySkills(),
      ]);
      setCatalog(catalogPage.data);
      setSelected(new Set(mine.data.map((s) => s.id)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaveError(null);
    setSaving(true);
    try {
      await replaceMySkills(Array.from(selected));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save your skills. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        description="Couldn't load the skills catalog."
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (catalog.length === 0) {
    return <EmptyState title="No skills available yet" description="The skills catalog is currently empty." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {catalog.map((skill) => {
          const active = selected.has(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(skill.id)}
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
      {saveError ? (
        <p role="alert" className="text-sm text-error">
          {saveError}
        </p>
      ) : null}
      <div>
        <Button variant="secondary" size="sm" loading={saving} onClick={() => void save()}>
          Save skills
        </Button>
      </div>
    </div>
  );
}
