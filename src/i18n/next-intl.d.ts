import type messages from "../../messages/en.json";
import type { formats, Locale } from "./config";

// Typed message keys: t("home.newTrip") is checked at compile time, and
// scripts/check-i18n.ts guarantees ta.json has exactly the same keys as en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
