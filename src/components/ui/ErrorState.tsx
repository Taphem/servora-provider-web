import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Generic "something went wrong" state for failed data fetches. */
export function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-error-soft bg-error-soft/40 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-error-soft text-error">
        <AlertTriangle size={20} aria-hidden />
      </span>
      <div>
        <p className="font-medium text-ink-900">{title}</p>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
