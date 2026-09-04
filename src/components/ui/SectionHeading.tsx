import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-h3 text-ink-900">{title}</h2>
        {description ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
