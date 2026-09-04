import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id?: string;
  label?: string;
  /** Helper copy shown below the field when there's no error. */
  helperText?: string;
  /** Presence of an error message switches the field into its error state. */
  errorText?: string;
  /** Visually confirms a valid value. Ignored while errorText is set. */
  success?: boolean;
}

export function Input({
  label,
  helperText,
  errorText,
  success = false,
  id,
  className,
  disabled,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = errorText || helperText ? `${inputId}-hint` : undefined;
  const hasError = Boolean(errorText);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedById}
        className={cn(
          "h-11 rounded-md border bg-surface-raised px-4 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
          "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-ink-50 disabled:text-text-tertiary",
          hasError
            ? "border-error focus:border-error"
            : success
              ? "border-success-500 focus:border-success-500"
              : "border-border-default hover:border-border-strong focus:border-primary",
          className,
        )}
        {...rest}
      />
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
