import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { step: 1, label: "About you" },
  { step: 2, label: "Skills & expertise" },
  { step: 3, label: "Service area" },
] as const;

export function WizardProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Onboarding progress">
      {/* Compact form for narrow viewports: a label plus a thin bar. */}
      <div className="sm:hidden">
        <p className="text-sm font-medium text-ink-900">
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].label}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-[var(--duration-base)]"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-center sm:flex">
        {STEPS.map(({ step, label }, index) => {
          const state = step < currentStep ? "complete" : step === currentStep ? "active" : "upcoming";
          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2.5" aria-current={state === "active" ? "step" : undefined}>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-[var(--duration-base)]",
                    state === "complete" && "bg-primary text-text-inverse",
                    state === "active" && "bg-ink-900 text-white",
                    state === "upcoming" && "bg-ink-100 text-ink-400",
                  )}
                >
                  {state === "complete" ? <Check size={16} aria-hidden /> : String(step).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium whitespace-nowrap",
                    state === "upcoming" ? "text-text-muted" : "text-ink-900",
                  )}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn("mx-4 h-px flex-1", step < currentStep ? "bg-primary" : "bg-border-default")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
