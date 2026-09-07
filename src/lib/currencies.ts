/**
 * Currencies offered in the provider price selector. servora-provider's
 * priceCurrency schema accepts any 3-letter ISO 4217 code (no backend
 * allowlist) — this list is a frontend UX choice, not a backend
 * restriction. INR is first/default: Servora is an India-first product.
 */
export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "INR", label: "₹ INR — Indian Rupee" },
  { code: "USD", label: "$ USD — US Dollar" },
];

export const DEFAULT_CURRENCY = "INR";
