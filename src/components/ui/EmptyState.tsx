import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Generic "nothing here yet" state for lists once real data exists. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-500">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="font-medium text-ink-900">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
