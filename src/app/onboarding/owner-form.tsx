"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveOwner, type OwnerField } from "@/app/actions/owner";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import type { FormState } from "@/lib/errors";

const idle: FormState<OwnerField> = { status: "idle" };

/** Creates the owner (onboarding step 1) or edits business details (settings). */
export function OwnerForm({ owner }: { owner?: { name: string; business_name: string } }) {
  const t = useTranslations();
  const [state, action] = useActionState(saveOwner, idle);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const typed = state.status === "error" ? state.values : {};

  return (
    <form action={action} noValidate className="space-y-4">
      <TextField
        name="name"
        label={t("owner.name")}
        defaultValue={typed.name ?? owner?.name ?? ""}
        error={errors.name}
        autoComplete="name"
        enterKeyHint="next"
        maxLength={80}
      />
      <TextField
        name="business_name"
        label={t("owner.businessName")}
        placeholder={t("owner.businessPlaceholder")}
        defaultValue={typed.business_name ?? owner?.business_name ?? ""}
        error={errors.business_name}
        autoComplete="organization"
        enterKeyHint="done"
        maxLength={120}
      />
      <FormError error={state.status === "error" ? state.formError : undefined} />
      <FormSuccess message={state.status === "ok" ? t("common.saved") : undefined} />
      <SubmitButton pendingLabel={t("common.saving")}>{owner ? t("common.save") : t("common.next")}</SubmitButton>
    </form>
  );
}
