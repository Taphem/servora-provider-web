import { cn } from "@/lib/utils";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Visually decorative by default (aria-hidden). Set false if it separates distinct sections for assistive tech. */
  decorative?: boolean;
}

export function Divider({ orientation = "horizontal", className, decorative = true }: DividerProps) {
  return (
    <div
      role={decorative ? undefined : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      aria-hidden={decorative || undefined}
      className={cn(
        "border-border-default",
        orientation === "horizontal" ? "w-full border-t" : "h-full border-l",
        className,
      )}
    />
  );
}
