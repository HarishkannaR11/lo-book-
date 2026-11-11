import { useTranslations } from "next-intl";
import type { InputHTMLAttributes, Ref } from "react";
import type { ErrorCode } from "@/lib/errors";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "prefix"> & {
  name: string;
  label: string;
  error?: ErrorCode;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  ref?: Ref<HTMLInputElement>;
};

export function TextField({ name, label, error, hint, optional, prefix, id, ref, ...input }: Props) {
  const t = useTranslations();
  const fieldId = id ?? `field-${name}`;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-base font-semibold">
        {label}
        {optional ? <span className="ms-1 font-normal text-muted">· {t("common.optional")}</span> : null}
      </label>
      <div className="flex items-stretch gap-2">
        {prefix ? (
          <span aria-hidden className="flex items-center rounded-xl border-2 border-line bg-canvas px-3 text-lg text-muted">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={fieldId}
          name={name}
          className="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...input}
        />
      </div>
      {hint ? (
        <p id={`${fieldId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm font-semibold text-danger">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-14 items-center gap-4 rounded-xl border-2 border-line bg-surface px-4 text-lg font-semibold">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-7 accent-brand" />
      {label}
    </label>
  );
}
