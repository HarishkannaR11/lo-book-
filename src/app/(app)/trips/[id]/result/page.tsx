import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

const KINDS = ["diesel", "toll", "bata", "repair", "fine", "other"] as const;

// Everything on this page comes from the trip_summary view. Nothing is added up here.
export default async function TripResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: s, error } = await supabase.from("trip_summary").select("*").eq("client_uuid", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!s) notFound();
  if (s.status !== "closed") redirect(`/trips/${id}`);

  const t = await getTranslations();
  const format = await getFormatter();
  const inr = (n: number | null) => format.number(n ?? 0, "inr");
  const profit = s.profit ?? 0;
  const amountOf = (k: (typeof KINDS)[number]) => s[`${k}_amount`] ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t("result.title")} backHref="/trips" />
      <p className="-mt-3 text-muted">
        {t("result.tripLine", { reg: formatReg(s.vehicle_reg ?? ""), route: t("trips.route", { from: s.from_place ?? "", to: s.to_place ?? "" }) })}
      </p>

      <section className={`card p-5 ${profit < 0 ? "border-danger" : "border-ok"}`}>
        <h2 className="text-base font-semibold text-muted">{profit < 0 ? t("result.loss") : t("result.profit")}</h2>
        <p className={`text-5xl font-bold tabular-nums ${profit < 0 ? "text-danger" : "text-ok"}`}>{inr(profit)}</p>
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-4 pt-4 text-lg font-bold">{t("result.breakdown")}</h2>
        <dl className="divide-y divide-line">
          <div className="flex min-h-12 items-center justify-between gap-4 px-4">
            <dt className="font-semibold">{t("result.freight")}</dt>
            <dd className="shrink-0 font-semibold tabular-nums">{inr(s.freight_amount)}</dd>
          </div>
          {KINDS.filter((k) => amountOf(k) !== 0).map((k) => (
            <div key={k} className="flex min-h-12 items-center justify-between gap-4 px-4">
              <dt>{t("result.minus", { label: t(`kinds.${k}`) })}</dt>
              <dd className="shrink-0 tabular-nums">{inr(amountOf(k))}</dd>
            </div>
          ))}
          <div className="flex min-h-12 items-center justify-between gap-4 px-4">
            <dt>{t("result.totalExpenses")}</dt>
            <dd className="shrink-0 tabular-nums">{inr(s.expense_total)}</dd>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-4 bg-canvas px-4">
            <dt className="text-lg font-bold">{profit < 0 ? t("result.loss") : t("result.profit")}</dt>
            <dd className={`text-lg font-bold tabular-nums ${profit < 0 ? "text-danger" : ""}`}>{inr(profit)}</dd>
          </div>
        </dl>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("result.mileage")}</h2>
        {s.mileage_kmpl !== null ? (
          <p className="text-4xl font-bold tabular-nums">{t("result.kmpl", { value: format.number(s.mileage_kmpl, "plain") })}</p>
        ) : (
          <p className="text-muted">{t("result.noMileage")}</p>
        )}
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-sm text-muted">{t("result.distance")}</dt>
            <dd className="shrink-0 font-semibold tabular-nums">{s.distance_km !== null ? t("trips.km", { km: s.distance_km }) : t("common.dash")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t("result.litres")}</dt>
            <dd className="shrink-0 font-semibold tabular-nums">{t("trips.litres", { litres: s.litres ?? 0 })}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted">{t("result.odometer")}</dt>
            <dd className="shrink-0 font-semibold tabular-nums">{t("result.odometerRange", { start: s.start_odometer ?? 0, end: s.end_odometer ?? 0 })}</dd>
          </div>
        </dl>
      </section>

      <section className="card flex min-h-14 items-center justify-between px-4">
        <span>{t("result.advance", { party: s.party_name ?? "" })}</span>
        <span className="font-semibold tabular-nums">{inr(s.advance_from_party)}</span>
      </section>

      <Link href="/trips" className="btn-secondary">
        {t("result.backToTrips")}
      </Link>
    </div>
  );
}
