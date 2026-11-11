"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { DeleteState } from "@/app/actions/masters";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const idle: DeleteState = { status: "idle" };

export function DeleteForm({
  id,
  action,
}: {
  id: string;
  action: (prev: DeleteState, formData: FormData) => Promise<DeleteState>;
}) {
  const t = useTranslations("common");
  const [state, formAction] = useActionState(action, idle);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(t("confirmDelete"))) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <FormError error={state.status === "error" ? state.error : undefined} />
      <SubmitButton className="btn-danger" pendingLabel={t("delete")}>
        {t("delete")}
      </SubmitButton>
    </form>
  );
}
