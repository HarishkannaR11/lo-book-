"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/actions/account";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const idle: DeleteAccountState = { status: "idle" };

/** Two taps on purpose: the first explains what goes, the second deletes it. */
export function DeleteAccount() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(deleteAccount, idle);

  if (!open) {
    return (
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        {t("settings.deleteAccount")}
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border-2 border-danger/40 p-4">
      <p className="font-semibold text-danger">{t("settings.deleteWarning")}</p>
      <input type="hidden" name="confirm" value="delete" />
      <FormError error={state.status === "error" ? state.error : undefined} />
      <SubmitButton className="btn-danger" pendingLabel={t("settings.deleting")}>
        {t("settings.deleteConfirm")}
      </SubmitButton>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
        {t("common.cancel")}
      </button>
    </form>
  );
}
