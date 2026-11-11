"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deletePayment } from "@/app/actions/parties";

export function DeletePaymentButton({ paymentId, partyId }: { paymentId: string; partyId: string }) {
  const t = useTranslations("parties");
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-link min-h-12 text-sm text-danger"
      onClick={async () => {
        if (!window.confirm(t("confirmDeletePayment"))) return;
        const { ok } = await deletePayment(paymentId, partyId);
        if (ok) router.refresh();
      }}
    >
      {t("deletePayment")}
    </button>
  );
}
