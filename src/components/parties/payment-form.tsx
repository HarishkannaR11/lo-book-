"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { TextField } from "@/components/ui/text-field";
import type { ErrorCode } from "@/lib/errors";
import { savePaymentLocally } from "@/lib/offline/mutations";
import { PAYMENT_MODES, paymentWire, toNumber, todayIST, type PaymentMode } from "@/lib/trip-schemas";

type Field = "amount" | "received_on" | "reference";

/** Any amount — part payments are the norm. Queued like every other write, so it works offline. */
export function PaymentForm({ partyId }: { partyId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [mode, setMode] = useState<PaymentMode>("upi");
  const [values, setValues] = useState({ amount: "", received_on: todayIST(), reference: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, ErrorCode>>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: Field) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit() {
    const candidate = {
      client_uuid: crypto.randomUUID(),
      party_id: partyId,
      amount: toNumber(values.amount),
      mode,
      received_on: values.received_on,
      reference: values.reference.trim() || null,
    };
    const parsed = paymentWire.safeParse(candidate);
    const next: Partial<Record<Field, ErrorCode>> = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[i.path[0] as Field] ??= i.message as ErrorCode;
    if (candidate.amount === null) next.amount = "required";
    if (values.received_on > todayIST()) next.received_on = "dateInvalid";
    if (!parsed.success || Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setBusy(true);
    const landed = await savePaymentLocally(parsed.data);
    const amount = format.number(parsed.data.amount, "inr");
    setSaved(t(landed ? "parties.received" : "parties.receivedOffline", { amount }));
    setValues((v) => ({ amount: "", received_on: v.received_on, reference: "" }));
    setErrors({});
    setBusy(false);
    if (landed) router.refresh();
  }

  return (
    <form action={onSubmit} noValidate className="space-y-4">
      <TextField name="amount" label={t("parties.amount")} inputMode="decimal" value={values.amount} onChange={set("amount")} error={errors.amount} autoComplete="off" enterKeyHint="next" maxLength={14} />
      <ChoiceGroup
        name="mode"
        legend={t("parties.mode")}
        columns={2}
        choices={PAYMENT_MODES.map((m) => ({ value: m, label: t(`parties.modes.${m}`) }))}
        value={mode}
        onChange={(m) => setMode(m as PaymentMode)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="received_on" type="date" label={t("parties.receivedOn")} value={values.received_on} max={todayIST()} onChange={set("received_on")} error={errors.received_on} />
        <TextField name="reference" label={t("parties.reference")} value={values.reference} onChange={set("reference")} error={errors.reference} optional autoComplete="off" maxLength={80} />
      </div>
      {saved ? (
        <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 font-semibold text-ok">
          {saved}
        </p>
      ) : null}
      <button type="submit" className="btn-primary min-h-16 text-xl" disabled={busy}>
        {busy ? t("common.saving") : t("parties.saveReceipt")}
      </button>
    </form>
  );
}
