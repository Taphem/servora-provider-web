"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Search, X } from "lucide-react";
import { LANGUAGE_OPTIONS, languageName } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface LanguageMultiSelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
  label?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
}

/**
 * A controlled, searchable multi-select restricted to LANGUAGE_OPTIONS —
 * there is no way to submit a language code that isn't from that list, so
 * this is the only place servora-provider's languages array is produced
 * from user input.
 *
 * The trigger input and its option list are deliberately capped to a
 * compact, fixed width (not the full width of whatever wide form field it
 * sits in) and rendered as one fused popover card — a bare `w-full`
 * dropdown inside a wide form reads as a giant, disconnected browser
 * listbox rather than a picker.
 */
export function LanguageMultiSelect({
  value,
  onChange,
  label = "Languages you speak",
  helperText,
  errorText,
  disabled,
}: LanguageMultiSelectProps) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? LANGUAGE_OPTIONS.filter((option) => option.name.toLowerCase().includes(q)) : LANGUAGE_OPTIONS;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
    inputRef.current?.focus();
  }

  function remove(code: string) {
    onChange(value.filter((c) => c !== code));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlightedIndex];
      if (option) toggle(option.code);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && query === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  const hasError = Boolean(errorText);
  const describedById = errorText || helperText ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      ) : null}

      <div ref={rootRef} className="relative w-full max-w-sm">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-describedby={describedById}
            aria-invalid={hasError || undefined}
            disabled={disabled}
            value={query}
            placeholder={value.length > 0 ? "Search to add another…" : "Search to add a language…"}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              "h-11 w-full border bg-surface-raised pl-10 pr-4 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
              open ? "rounded-t-md border-b-transparent" : "rounded-md",
              "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-ink-50 disabled:text-text-tertiary",
              hasError
                ? "border-error focus:border-error"
                : "border-border-default hover:border-border-strong focus:border-primary",
            )}
          />
        </div>

        {open && !disabled ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Languages"
            aria-multiselectable="true"
            className="absolute z-(--z-overlay) max-h-64 w-full overflow-y-auto rounded-b-md border border-t border-border-default bg-surface-raised py-1 shadow-lg"
          >
            {options.length === 0 ? (
              <li className="px-4 py-2 text-sm text-text-muted">No languages found.</li>
            ) : (
              options.map((option, index) => {
                const selected = value.includes(option.code);
                return (
                  <li
                    key={option.code}
                    role="option"
                    aria-selected={selected}
                    // onMouseDown (not onClick) fires before the input's blur/outside-click handling closes the list.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      toggle(option.code);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-ink-900",
                      index === highlightedIndex && "bg-ink-50",
                      selected && "font-medium text-brand-700",
                    )}
                  >
                    <Check size={14} className={cn(selected ? "opacity-100" : "opacity-0")} aria-hidden />
                    {option.name}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Selected languages">
          {value.map((code) => (
            <li key={code}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1.5 text-sm text-brand-700">
                {languageName(code)}
                <button
                  type="button"
                  onClick={() => remove(code)}
                  aria-label={`Remove ${languageName(code)}`}
                  disabled={disabled}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
                >
                  <X size={12} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {errorText ? (
        <p id={describedById} role="alert" className="text-xs text-error">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={describedById} className="text-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
