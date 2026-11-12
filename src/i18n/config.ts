// Tamil first (the default), then English, then other Indian languages by number of speakers.
export const locales = ["ta", "en", "hi", "bn", "mr", "te", "gu", "kn", "ml", "or", "pa"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ta";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * A phone set to an Indian language ("te-IN,te;q=0.9,en;q=0.8") opens the app in that language.
 * Everything else opens in Tamil, the product default. That includes English, because most
 * Indian phones are set to English whatever their owner reads. English is one tap away on the
 * login screen.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.trim().slice(2) ?? "1");
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  const indian = ranked.find((x) => x.lang !== "en" && isLocale(x.lang));
  return indian && isLocale(indian.lang) ? indian.lang : defaultLocale;
}

// Latin digits (0–9) in every language: what owners type, and what bunk slips and number
// plates print. Marathi and Bengali would otherwise default to their own digits.
export const formats = {
  number: {
    inr: {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      trailingZeroDisplay: "stripIfInteger",
      numberingSystem: "latn",
    },
    plain: { maximumFractionDigits: 2, numberingSystem: "latn" },
  },
  dateTime: {
    short: { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" },
  },
} as const;
