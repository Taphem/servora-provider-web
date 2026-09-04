import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge ships knowing Tailwind's own default theme scale, not the
 * Servora custom one — without this, its font-size matcher doesn't
 * recognize names like `text-h2`, falls through to the (much more
 * permissive) text-color matcher, and silently drops the size class
 * whenever a color class appears alongside it in the same cn() call. This
 * teaches it the named type scale (see the `--text-*` tokens in
 * globals.css) so `cn("text-h2", "text-ink-900")` keeps both.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "body", "small", "label", "caption"],
    },
  },
});

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
