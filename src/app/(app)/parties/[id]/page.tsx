import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { DeletePaymentButton } from "@/components/parties/delete-payment";
import { PaymentForm } from "@/components/parties/payment-form";
import { PendingPayments } from "@/components/parties/pending-payments";
import { ReminderButton } from "@/components/parties/reminder-button";
import { PageHeader } from "@/components/ui/page-header";
import { locales, type Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/owner";
import { reminderText, whatsappLink } from "@/lib/reminder";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/trip-schemas";
import { uuid } from "@/lib/validation";

// Every figure here is read from party_outstanding / party_ledger. Nothing is summed on the page.
export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const owner = await requireOwner();
  const supabase = await createClient();
  const [summary, ledger] = await Promise.all([
    supabase.from("party_outstanding").select("*").eq("party_id", id).maybeSingle(),
    supabase.from("party_ledger").select("*").eq("party_id", id).order("seq", { ascending: false }),
  ]);
  if (summary.error || ledger.error) throw new Error((summary.error ?? ledger.error)?.message);
  const p = summary.data;
  if (!p) notFound();

  const t = await getTranslations();
  const format = await getFormatter();
  const inr = (n: number | null) => format.number(n ?? 0, "inr");
  const due = p.outstanding ?? 0;
  const entries = ledger.data;

  const recentTrips = entries
    .filter((e) => e.kind === "trip")
    .slice(0, 3)
    .map((e) => ({ from: e.from_place ?? "", to: e.to_place ?? "", date: e.entry_date ?? todayIST(), freight: e.debit ?? 0 }));
  const reminder = {
    party: p.name ?? "",
    partyPhone: p.phone,
    business: owner.business_name,
    owner: owner.name,
    ownerPhone: owner.phone,
    outstanding: due,
    today: todayIST(),
    trips: recentTrips,
  };
  // One ready-made message per language; the owner picks the one the party reads.
  const links =
    due > 0
      ? (Object.fromEntries(
          await Promise.all(locales.map(async (l) => [l, whatsappLink(p.phone, await reminderText(l, reminder))] as const)),
        ) as Record<Locale, string>)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title={p.name ?? ""} backHref="/parties" />
      {p.place ? <p className="-mt-3 text-muted">{p.place}</p> : null}

      <section className="card p-5">
        <h2 className="text-base font-semibold text-muted">{due < 0 ? t("parties.inCredit") : t("parties.outstanding")}</h2>
        <p className={`text-5xl font-bold tabular-nums ${due > 0 ? "" : "text-ok"}`}>{inr(Math.abs(due))}</p>
        <dl className="mt-4 divide-y divide-line border-t border-line text-base">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <dt>{t("parties.openingBalance")}</dt>
            <dd className="shrink-0 tabular-nums">{inr(p.opening_balance)}</dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-4">
            <dt>{t("parties.plusFreight")}</dt>
            <dd className="shrink-0 tabular-nums">{inr(p.billed)}</dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-4">
            <dt>{t("parties.minusAdvance")}</dt>
            <dd className="shrink-0 tabular-nums">{inr(p.advance_received)}</dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-4">
            <dt>{t("parties.minusPayments")}</dt>
            <dd className="shrink-0 tabular-nums">{inr(p.payments_received)}</dd>
          </div>
        </dl>
      </section>

      {links ? <ReminderButton links={links} hasPhone={Boolean(p.phone)} /> : null}

      <section className="card space-y-4 p-4">
        <h2 className="text-lg font-bold">{t("parties.recordPayment")}</h2>
        <PaymentForm partyId={id} />
      </section>

      <PendingPayments partyId={id} />

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("parties.ledger")}</h2>
        {entries.length === 0 ? <p className="card px-4 py-5 text-muted">{t("parties.ledgerEmpty")}</p> : null}
        <ul className="card divide-y divide-line overflow-hidden">
          {entries.map((e) => {
            const credit = (e.credit ?? 0) > 0;
            const route = t("trips.route", { from: e.from_place ?? "", to: e.to_place ?? "" });
            const label =
              e.kind === "opening"
                ? t("parties.entry.opening")
                : e.kind === "trip"
                  ? t("parties.entry.trip", { route })
                  : e.kind === "advance"
                    ? t("parties.entry.advance", { route })
                    : t("parties.entry.payment", { mode: e.mode ? t(`parties.modes.${e.mode}`) : "" });
            return (
              <li key={`${e.kind}-${e.ref_id}`} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    {e.kind === "trip" && e.trip_client_uuid ? (
                      <Link href={`/trips/${e.trip_client_uuid}/result`} className="flex min-h-12 items-center font-semibold text-brand underline-offset-4 active:underline">
                        {label}
                      </Link>
                    ) : (
                      <span className="block font-semibold">{label}</span>
                    )}
                    <span className="block text-sm text-muted">
                      {[e.kind === "opening" ? null : format.dateTime(new Date(e.entry_date ?? todayIST()), "short"), e.reference].filter(Boolean).join(t("common.sep"))}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={`block text-lg font-semibold tabular-nums ${credit ? "text-ok" : ""}`}>
                      {t(credit ? "parties.creditAmount" : "parties.debitAmount", { amount: inr(credit ? e.credit : e.debit) })}
                    </span>
                    <span className="block text-sm text-muted tabular-nums">{t("parties.balanceAfter", { amount: inr(e.balance) })}</span>
                  </span>
                </div>
                {e.kind === "payment" && e.ref_id ? <DeletePaymentButton paymentId={e.ref_id} partyId={id} /> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <Link href={`/settings/parties/${id}`} className="btn-secondary">
        {t("parties.editTitle")}
      </Link>
    </div>
  );
}
