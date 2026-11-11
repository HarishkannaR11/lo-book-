export const locales = ["ta", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ta";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const formats = {
  number: {
    inr: { style: "currency", currency: "INR", maximumFractionDigits: 0 },
  },
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric" },
  },
} as const;
