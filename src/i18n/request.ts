import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, formats, isLocale, LOCALE_COOKIE, type Locale } from "./config";

// No locale in the URL: the choice lives in a cookie (and on the owner's row, which is
// copied into the cookie at sign-in so a new phone picks it up). Tamil unless told otherwise.
export default getRequestConfig(async ({ locale: requested }) => {
  let locale: Locale = defaultLocale;
  if (isLocale(requested)) {
    locale = requested; // explicit, e.g. the offline page renders both languages statically
  } else {
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) locale = fromCookie;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Kolkata",
    formats,
  };
});
