"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useFormatter, useTranslations } from "next-intl";
import { db } from "@/lib/offline/db";

/** Payments recorded on this phone that the server hasn't confirmed: shown, not counted. */
export function PendingPayments({ partyId }: { partyId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const rows = useLiveQuery(() => db.payments.where("party_id").equals(partyId).sortBy("created_at"), [partyId]);
  if (!rows?.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-brand">{t("parties.pendingPayments", { count: rows.length })}</h2>
      <ul className="card divide-y divide-line border-dashed">
        {rows.map((p) => (
          <li key={p.client_uuid} className="flex min-h-14 items-center justify-between px-4">
            <span>{t(`parties.modes.${p.mode}`)}</span>
            <span className="font-semibold tabular-nums">{format.number(p.amount, "inr")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
