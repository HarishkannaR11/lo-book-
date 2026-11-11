"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { locales, type Locale } from "@/i18n/config";

/**
 * Opens WhatsApp with the reminder already written. Tamil by default; English for parties
 * who don't read Tamil. Nothing is sent until the owner presses send in WhatsApp.
 */
export function ReminderButton({ links, hasPhone }: { links: Record<Locale, string>; hasPhone: boolean }) {
  const t = useTranslations();
  const [lang, setLang] = useState<Locale>("ta");
  return (
    <div className="space-y-3">
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold text-muted">{t("parties.reminderLanguage")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {locales.map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={lang === l ? "btn-primary" : "btn-secondary"}>
              {t(`language.${l}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <a href={links[lang]} target="_blank" rel="noopener noreferrer" className="btn-secondary border-ok text-ok">
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z" />
        </svg>
        {t("parties.reminder")}
      </a>
      {!hasPhone ? <p className="text-sm text-muted">{t("parties.reminderNoPhone")}</p> : null}
    </div>
  );
}
