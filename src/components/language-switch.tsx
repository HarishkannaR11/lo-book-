import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions/locale";
import { locales } from "@/i18n/config";

/** Every language, each written in its own script. Works without JavaScript (plain form posts). */
async function LanguageGrid() {
  const current = await getLocale();
  const t = await getTranslations("language");
  return (
    <form action={setLocale} aria-label={t("label")} className="grid grid-cols-2 gap-2">
      {locales.map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          lang={l}
          aria-pressed={l === current}
          className={l === current ? "btn-primary text-base" : "btn-secondary text-base"}
        >
          {t(l)}
        </button>
      ))}
    </form>
  );
}

/** Settings: the full grid. Login: a single button that opens it. */
export async function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  if (!compact) return <LanguageGrid />;
  const current = await getLocale();
  const t = await getTranslations("language");
  return (
    <details className="group w-full">
      <summary className="ms-auto flex min-h-12 w-fit cursor-pointer list-none items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 font-semibold [&::-webkit-details-marker]:hidden">
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
        <span lang={current}>{t(current)}</span>
        <span className="sr-only">{t("label")}</span>
      </summary>
      <div className="mt-3">
        <LanguageGrid />
      </div>
    </details>
  );
}
