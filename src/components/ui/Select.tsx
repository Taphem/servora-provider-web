import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Styled native <select> — keeps built-in keyboard navigation, screen-reader
 * support and mobile picker behavior rather than reimplementing a listbox.
 */
export function Select({
  label,
  helperText,
  errorText,
  options,
  placeholder,
  id,
  className,
  disabled,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const describedById = errorText || helperText ? `${selectId}-hint` : undefined;
  const hasError = Boolean(errorText);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedById}
          defaultValue={rest.defaultValue ?? (placeholder ? "" : undefined)}
          className={cn(
            "h-11 w-full appearance-none rounded-md border bg-surface-raised px-4 pr-10 text-sm text-ink-900 transition-colors duration-[var(--duration-fast)]",
            "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-ink-50 disabled:text-text-tertiary",
            hasError
              ? "border-error focus:border-error"
              : "border-border-default hover:border-border-strong focus:border-primary",
            className,
          )}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
      </div>
      {errorText ? (
        <p id={describedById} className="text-xs text-error">
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
