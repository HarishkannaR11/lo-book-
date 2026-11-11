"use client";

import { useTranslations } from "next-intl";
import type { ErrorCode } from "@/lib/errors";

export type Choice = { value: string; label: string; sub?: string | null };

/** Big tap-target radio buttons: one tap picks a vehicle, driver, party or expense kind. */
export function ChoiceGroup({
  name,
  legend,
  choices,
  value,
  onChange,
  error,
  columns = 2,
}: {
  name: string;
  legend: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
  error?: ErrorCode;
  columns?: 2 | 3;
}) {
  const t = useTranslations("errors");
  return (
    <fieldset className="space-y-1.5" aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 text-base font-semibold">{legend}</legend>
      <div className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {choices.map((c) => {
          const checked = c.value === value;
          return (
            <label
              key={c.value}
              className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border-2 px-3 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand ${
                checked ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-surface"
              }`}
            >
              <input type="radio" name={name} value={c.value} checked={checked} onChange={() => onChange(c.value)} className="sr-only" />
              <span className="truncate text-base font-semibold">{c.label}</span>
              {c.sub ? <span className="truncate text-sm text-muted">{c.sub}</span> : null}
            </label>
          );
        })}
      </div>
      {error ? <p className="text-sm font-semibold text-danger">{t(error)}</p> : null}
    </fieldset>
  );
}
