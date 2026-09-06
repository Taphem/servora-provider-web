"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LANGUAGE_OPTIONS.filter((option) => !value.includes(option.code)).filter((option) =>
      q ? option.name.toLowerCase().includes(q) : true,
    );
  }, [query, value]);

  function select(code: string) {
    onChange([...value, code]);
    setQuery("");
    setHighlightedIndex(0);
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
      if (option) select(option.code);
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

      <div className="relative">
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
          placeholder={value.length > 0 ? "Search to add another…" : "Search languages…"}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-11 w-full rounded-md border bg-surface-raised px-4 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
            "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-ink-50 disabled:text-text-tertiary",
            hasError
              ? "border-error focus:border-error"
              : "border-border-default hover:border-border-strong focus:border-primary",
          )}
        />

        {open && !disabled ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Languages"
            className="absolute z-(--z-raised) mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border-default bg-surface-raised py-1 shadow-md"
          >
            {options.length === 0 ? (
              <li className="px-4 py-2 text-sm text-text-muted">No languages found.</li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.code}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  // onMouseDown (not onClick) fires before the input's onBlur closes the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    select(option.code);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "cursor-pointer px-4 py-2 text-sm text-ink-900",
                    index === highlightedIndex && "bg-brand-50 text-brand-700",
                  )}
                >
                  {option.name}
                </li>
              ))
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
