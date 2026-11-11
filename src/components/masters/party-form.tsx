"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { saveParty, type PartyField } from "@/app/actions/masters";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import type { Tables } from "@/lib/database.types";
import type { FormState } from "@/lib/errors";
import { formatMobile } from "@/lib/format";

type Party = Pick<Tables<"parties">, "id" | "name" | "phone" | "place" | "opening_balance">;
const idle: FormState<PartyField> = { status: "idle" };

export function PartyForm({ party }: { party?: Party }) {
  const t = useTranslations();
  const [state, action] = useActionState(saveParty, idle);
  const first = useRef<HTMLInputElement>(null);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const typed = state.status === "error" ? state.values : {};

  useEffect(() => {
    if (state.status === "ok") first.current?.focus();
  }, [state]);

  return (
    <form action={action} noValidate className="space-y-4">
      {party ? <input type="hidden" name="id" value={party.id} /> : null}
      <TextField
        ref={first}
        name="name"
        label={t("parties.name")}
        placeholder={t("parties.namePlaceholder")}
        defaultValue={typed.name ?? party?.name ?? ""}
        error={errors.name}
        autoComplete="off"
        enterKeyHint="next"
        maxLength={120}
      />
      <TextField
        name="place"
        label={t("parties.place")}
        placeholder={t("parties.placePlaceholder")}
        defaultValue={typed.place ?? party?.place ?? ""}
        error={errors.place}
        optional
        autoComplete="off"
        enterKeyHint="next"
        maxLength={80}
      />
      <TextField
        name="phone"
        type="tel"
        inputMode="numeric"
        label={t("parties.phone")}
        prefix={t("login.phonePrefix")}
        placeholder={t("login.phonePlaceholder")}
        defaultValue={typed.phone ?? (party?.phone ? formatMobile(party.phone) : "")}
        error={errors.phone}
        optional
        autoComplete="off"
        enterKeyHint="next"
        maxLength={14}
      />
      <TextField
        name="opening_balance"
        inputMode="decimal"
        label={t("parties.openingBalance")}
        hint={t("parties.openingBalanceHint")}
        defaultValue={typed.opening_balance ?? (party && party.opening_balance !== 0 ? String(party.opening_balance) : "")}
        error={errors.opening_balance}
        optional
        autoComplete="off"
        enterKeyHint="done"
        maxLength={14}
      />
      <FormError error={state.status === "error" ? state.formError : undefined} />
      <FormSuccess message={state.status === "ok" && state.label ? t("parties.added", { name: state.label }) : undefined} />
      <SubmitButton pendingLabel={t("common.saving")}>{party ? t("common.save") : t("parties.add")}</SubmitButton>
    </form>
  );
}
