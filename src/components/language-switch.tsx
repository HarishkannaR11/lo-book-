import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions/locale";
import { locales } from "@/i18n/config";

/** Full two-button switch (settings) or a single "switch to the other language" button (login). */
export async function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const current = await getLocale();
  const t = await getTranslations("language");

  if (compact) {
    const other = locales.find((l) => l !== current) ?? "ta";
    return (
      <form action={setLocale}>
        <button name="locale" value={other} lang={other} className="btn-secondary w-auto px-4 text-base">
          {t(other)}
        </button>
      </form>
    );
  }

  return (
    <form action={setLocale} aria-label={t("label")} className="grid grid-cols-2 gap-3">
      {locales.map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          lang={l}
          aria-pressed={l === current}
          className={l === current ? "btn-primary" : "btn-secondary"}
        >
          {t(l)}
        </button>
      ))}
    </form>
  );
}
