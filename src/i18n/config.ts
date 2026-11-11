export const locales = ["ta", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ta";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const formats = {
  number: {
    // ₹54,000 for whole rupees, ₹53,999.50 when there are paise — so a ledger matches a hand count.
    inr: { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2, trailingZeroDisplay: "stripIfInteger" },
  },
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric" },
  },
} as const;
