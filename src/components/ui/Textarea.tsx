import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
}

export function Textarea({
  label,
  helperText,
  errorText,
  id,
  className,
  disabled,
  rows = 4,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const describedById = errorText || helperText ? `${textareaId}-hint` : undefined;
  const hasError = Boolean(errorText);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={textareaId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        rows={rows}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedById}
        className={cn(
          "resize-y rounded-md border bg-surface-raised px-4 py-3 text-sm text-ink-900 placeholder:text-text-tertiary transition-colors duration-[var(--duration-fast)]",
          "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-ink-50 disabled:text-text-tertiary",
          hasError
            ? "border-error focus:border-error"
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
