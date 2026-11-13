import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PendingTrips } from "@/components/trips/pending";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function Trips() {
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();
  const cols = "client_uuid, vehicle_reg, from_place, to_place, party_name, started_on, ended_on, expense_total, profit, mileage_kmpl";
  const [open, closed] = await Promise.all([
    supabase.from("trip_summary").select(cols).eq("status", "open").order("started_on", { ascending: false }),
    supabase.from("trip_summary").select(cols).eq("status", "closed").order("ended_on", { ascending: false }).limit(20),
  ]);
  if (open.error || closed.error) throw new Error((open.error ?? closed.error)?.message);

  return (
    <div className="space-y-6">
      <PageHeader title={t("trips.title")} />
      <div className="grid gap-3">
        <Link href="/trips/new" className="btn-primary min-h-16 text-xl">
          {t("trips.new")}
        </Link>
        <Link href="/reports" className="btn-secondary">
          {t("reports.title")}
        </Link>
      </div>
      <PendingTrips />

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("trips.open")}</h2>
        {open.data.length === 0 ? <p className="card px-4 py-5 text-muted">{t("trips.noOpen")}</p> : null}
        <ul className="space-y-2">
          {open.data.map((tr) => (
            <li key={tr.client_uuid}>
              <Link href={`/trips/${tr.client_uuid}`} className="card block space-y-0.5 p-4 active:bg-canvas">
                <span className="block text-lg font-semibold">{formatReg(tr.vehicle_reg ?? "")}</span>
                <span className="block">{t("trips.route", { from: tr.from_place ?? "", to: tr.to_place ?? "" })}</span>
                <span className="block text-sm text-muted">
                  {t("trips.openLine", { party: tr.party_name ?? "", spent: format.number(tr.expense_total ?? 0, "inr") })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {closed.data.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t("trips.recentClosed")}</h2>
          <ul className="space-y-2">
            {closed.data.map((tr) => (
              <li key={tr.client_uuid}>
                <Link href={`/trips/${tr.client_uuid}/result`} className="card flex items-center gap-3 p-4 active:bg-canvas">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t("trips.route", { from: tr.from_place ?? "", to: tr.to_place ?? "" })}</span>
                    <span className="block truncate text-sm text-muted">
                      {t("trips.closedLine", { reg: formatReg(tr.vehicle_reg ?? ""), date: format.dateTime(new Date(tr.ended_on ?? tr.started_on ?? ""), "short") })}
                    </span>
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${(tr.profit ?? 0) < 0 ? "text-danger" : ""}`}>{format.number(tr.profit ?? 0, "inr")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
