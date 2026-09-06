/**
 * The controlled list of languages a provider can select from. Values are
 * the 2-letter ISO 639-1 codes servora-provider's languageCodeSchema
 * expects (see servora-provider/src/schemas/common.ts) — never a
 * freeform code a user could type themselves.
 */
export interface LanguageOption {
  code: string;
  name: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "ta", name: "Tamil" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
  { code: "ur", name: "Urdu" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Mandarin Chinese" },
  { code: "de", name: "German" },
  { code: "ne", name: "Nepali" },
  { code: "si", name: "Sinhala" },
  { code: "or", name: "Odia" },
];

export const KNOWN_LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map((option) => option.code));

export function languageName(code: string): string {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.name ?? code;
}
