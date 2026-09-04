import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "inverse";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-ink-50 text-ink-700 border-border-default",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-success-100 text-success-500 border-success-100",
  warning: "bg-warning-100 text-warning-500 border-warning-100",
  danger: "bg-danger-100 text-danger-600 border-danger-100",
  inverse: "bg-white/10 text-white border-white/15 backdrop-blur-sm",
};

export function Badge({ children, tone = "neutral", icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label",
        toneStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
