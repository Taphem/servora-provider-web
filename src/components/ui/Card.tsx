import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, className, interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-surface-raised shadow-xs",
        interactive &&
          "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-1 hover:border-border-strong hover:shadow-md",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
