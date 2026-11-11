"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { saveVehicle, type VehicleField } from "@/app/actions/masters";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { CheckboxField, TextField } from "@/components/ui/text-field";
import type { Tables } from "@/lib/database.types";
import type { FormState } from "@/lib/errors";
import { formatReg } from "@/lib/format";

type Vehicle = Pick<Tables<"vehicles">, "id" | "reg_number" | "nickname" | "is_active">;
const idle: FormState<VehicleField> = { status: "idle" };

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const t = useTranslations();
  const [state, action] = useActionState(saveVehicle, idle);
  const first = useRef<HTMLInputElement>(null);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const typed = state.status === "error" ? state.values : {};

  useEffect(() => {
    if (state.status === "ok") first.current?.focus(); // ready for the next lorry
  }, [state]);

  return (
    <form action={action} noValidate className="space-y-4">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
      <TextField
        ref={first}
        name="reg_number"
        label={t("vehicles.regNumber")}
        placeholder={t("vehicles.regPlaceholder")}
        defaultValue={typed.reg_number ?? (vehicle ? formatReg(vehicle.reg_number) : "")}
        error={errors.reg_number}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="next"
        maxLength={16}
      />
      <TextField
        name="nickname"
        label={t("vehicles.nickname")}
        placeholder={t("vehicles.nicknamePlaceholder")}
        defaultValue={typed.nickname ?? vehicle?.nickname ?? ""}
        error={errors.nickname}
        optional
        maxLength={40}
        enterKeyHint="done"
      />
      {vehicle ? <CheckboxField name="is_active" label={t("common.inUse")} defaultChecked={vehicle.is_active} /> : null}
      <FormError error={state.status === "error" ? state.formError : undefined} />
      <FormSuccess
        message={state.status === "ok" && state.label ? t("vehicles.added", { reg: formatReg(state.label) }) : undefined}
      />
      <SubmitButton pendingLabel={t("common.saving")}>{vehicle ? t("common.save") : t("vehicles.add")}</SubmitButton>
    </form>
  );
}
