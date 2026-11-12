import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { formats, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./config";

// No locale in the URL. Order: explicit (e.g. the static offline page) → the owner's saved
// choice (cookie, copied from their account at sign-in) → the phone's language → Tamil.
export default getRequestConfig(async ({ locale: requested }) => {
  let locale: Locale;
  if (isLocale(requested)) {
    locale = requested;
  } else {
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    locale = isLocale(fromCookie) ? fromCookie : negotiateLocale((await headers()).get("accept-language"));
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Kolkata",
    formats,
  };
});
