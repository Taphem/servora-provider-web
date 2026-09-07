"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { createMySkill, listSkillsCatalog } from "@/lib/api/provider";
import type { Skill } from "@/types/domain";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface SkillsExpertiseProps {
  value: Skill[];
  onChange: (skills: Skill[]) => void;
}

type LoadStatus = "loading" | "ready" | "error";

/**
 * Provider-defined expertise — deliberately independent of the Services
 * catalog. A skill here does not need to correspond to any catalog service
 * (e.g. "Gas charging" for a provider who offers "AC Repair"). The catalog
 * (GET /providers/skills) is used only as autocomplete suggestions inside
 * the popover; typing a name that doesn't match anything lets the provider
 * create it for real via POST /providers/me/skills — never a display-only chip.
 */
export function SkillsExpertise({ value, onChange }: SkillsExpertiseProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      void listSkillsCatalog({ pageSize: 100 })
        .then((page) => {
          setCatalog(page.data);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const selectedIds = useMemo(() => new Set(value.map((s) => s.id)), [value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? catalog.filter((s) => s.name.toLowerCase().includes(q)) : catalog;
  }, [catalog, query]);

  const exactMatch = useMemo(
    () => catalog.some((s) => s.name.trim().toLowerCase() === query.trim().toLowerCase()),
    [catalog, query],
  );

  function addSkill(skill: Skill) {
    if (selectedIds.has(skill.id)) return;
    onChange([...value, skill]);
  }

  function toggleSkill(skill: Skill) {
    if (selectedIds.has(skill.id)) {
      onChange(value.filter((s) => s.id !== skill.id));
    } else {
      addSkill(skill);
    }
  }

  function removeSkill(id: string) {
    onChange(value.filter((s) => s.id !== id));
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const skill = await createMySkill(name);
      setCatalog((prev) => (prev.some((s) => s.id === skill.id) ? prev : [...prev, skill]));
      addSkill(skill);
      setQuery("");
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Couldn't add that skill. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={rootRef} className="relative w-full">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input
            role="combobox"
            aria-label="Search or add a skill"
            aria-expanded={open}
            aria-controls="skills-expertise-listbox"
            aria-autocomplete="list"
            value={query}
            placeholder="Search or add a skill…"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter") {
                event.preventDefault();
                const first = matches[0];
                if (first) toggleSkill(first);
                else if (query.trim() && !exactMatch) void handleCreate();
              }
            }}
            className={cn(
              "h-12 w-full border bg-surface-raised pl-11 pr-4 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
              open ? "rounded-t-lg border-b-transparent" : "rounded-lg",
              "border-border-default hover:border-border-strong focus:border-primary",
            )}
          />
        </div>

        {open ? (
          <div
            id="skills-expertise-listbox"
            role="listbox"
            aria-label="Skills"
            aria-multiselectable="true"
            className="absolute z-(--z-overlay) max-h-64 w-full overflow-y-auto rounded-b-lg border border-t border-border-default bg-surface-raised py-1 shadow-lg"
          >
            {status === "loading" ? (
              <p className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted">
                <Spinner size={13} /> Loading skills…
              </p>
            ) : (
              <>
                {matches.map((skill) => {
                  const selected = selectedIds.has(skill.id);
                  return (
                    <div
                      key={skill.id}
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        toggleSkill(skill);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-ink-900 hover:bg-ink-50",
                        selected && "font-medium text-brand-700",
                      )}
                    >
                      <Check size={14} className={cn(selected ? "opacity-100" : "opacity-0")} aria-hidden />
                      {skill.name}
                    </div>
                  );
                })}
                {query.trim() && !exactMatch ? (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      void handleCreate();
                    }}
                    disabled={creating}
                    className="flex w-full items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-left text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                  >
                    {creating ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
                    Add &quot;{query.trim()}&quot; as a new skill
                  </button>
                ) : null}
                {matches.length === 0 && !query.trim() ? (
                  <p className="px-4 py-3 text-sm text-text-muted">
                    {status === "error" ? "Couldn't load skill suggestions — you can still add your own." : "No skills yet — search to add your own."}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {createError ? (
        <p role="alert" className="text-sm text-error">
          {createError}
        </p>
      ) : null}

      {value.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Your expertise</p>
          <ul className="flex flex-wrap gap-2" aria-label="Selected expertise">
            {value.map((skill) => (
              <li key={skill.id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1.5 pl-3.5 pr-2 text-sm font-medium text-brand-700">
                  {skill.name}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill.id)}
                    aria-label={`Remove ${skill.name}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-text-muted">
        You can add skills from the catalog, or create your own.
      </p>
    </div>
  );
}
