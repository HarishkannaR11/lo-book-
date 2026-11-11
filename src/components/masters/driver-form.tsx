"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { saveDriver, type DriverField } from "@/app/actions/masters";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { CheckboxField, TextField } from "@/components/ui/text-field";
import type { Tables } from "@/lib/database.types";
import type { FormState } from "@/lib/errors";
import { formatMobile } from "@/lib/format";

type Driver = Pick<Tables<"drivers">, "id" | "name" | "phone" | "licence_number" | "is_active">;
const idle: FormState<DriverField> = { status: "idle" };

export function DriverForm({ driver }: { driver?: Driver }) {
  const t = useTranslations();
  const [state, action] = useActionState(saveDriver, idle);
  const first = useRef<HTMLInputElement>(null);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const typed = state.status === "error" ? state.values : {};

  useEffect(() => {
    if (state.status === "ok") first.current?.focus();
  }, [state]);

  return (
    <form action={action} noValidate className="space-y-4">
      {driver ? <input type="hidden" name="id" value={driver.id} /> : null}
      <TextField
        ref={first}
        name="name"
        label={t("drivers.name")}
        defaultValue={typed.name ?? driver?.name ?? ""}
        error={errors.name}
        autoComplete="off"
        enterKeyHint="next"
        maxLength={80}
      />
      <TextField
        name="phone"
        type="tel"
        inputMode="numeric"
        label={t("drivers.phone")}
        prefix={t("login.phonePrefix")}
        placeholder={t("login.phonePlaceholder")}
        defaultValue={typed.phone ?? (driver ? formatMobile(driver.phone) : "")}
        error={errors.phone}
        autoComplete="off"
        enterKeyHint="next"
        maxLength={14}
      />
      <TextField
        name="licence_number"
        label={t("drivers.licence")}
        defaultValue={typed.licence_number ?? driver?.licence_number ?? ""}
        error={errors.licence_number}
        optional
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        maxLength={30}
      />
      {driver ? <CheckboxField name="is_active" label={t("common.inUse")} defaultChecked={driver.is_active} /> : null}
      <FormError error={state.status === "error" ? state.formError : undefined} />
      <FormSuccess message={state.status === "ok" && state.label ? t("drivers.added", { name: state.label }) : undefined} />
      <SubmitButton pendingLabel={t("common.saving")}>{driver ? t("common.save") : t("drivers.add")}</SubmitButton>
    </form>
  );
}
