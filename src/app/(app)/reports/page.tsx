import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/trip-schemas";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
function shift(month: string, by: number): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// One month, per vehicle: trips, freight, expenses, profit, mileage — all from monthly_report.
export default async function Reports({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: asked } = await searchParams;
  const current = todayIST().slice(0, 7);
  const month = asked && MONTH.test(asked) && asked <= current ? asked : current;
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();
  const [report, vehicles] = await Promise.all([
    supabase.from("monthly_report").select("*").eq("month", `${month}-01`),
    supabase.from("vehicles").select("id, reg_number, nickname"),
  ]);
  if (report.error || vehicles.error) throw new Error((report.error ?? vehicles.error)?.message);

  const regs = new Map(vehicles.data.map((v) => [v.id, v]));
  const total = report.data.find((r) => r.is_total);
  const rows = report.data
    .filter((r) => !r.is_total)
    .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0));
  const inr = (n: number | null) => format.number(n ?? 0, "inr");
  const kmpl = (n: number | null) => (n === null ? t("common.dash") : t("result.kmpl", { value: format.number(n, "plain") }));

  const stats = (r: (typeof report.data)[number]) => (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
      {[
        [t("reports.trips"), format.number(r.trips ?? 0, "plain")],
        [t("reports.revenue"), inr(r.revenue)],
        [t("reports.expenses"), inr(r.expenses)],
        [t("reports.mileage"), kmpl(r.mileage_kmpl)],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")} />
      <nav className="-mt-2 flex items-center justify-between gap-2">
        <Link href={`/reports?month=${shift(month, -1)}`} aria-label={t("reports.prev")} className="btn-secondary w-14 px-0">
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h2 className="text-xl font-bold">{format.dateTime(new Date(`${month}-01T00:00:00+05:30`), "month")}</h2>
        {month < current ? (
          <Link href={`/reports?month=${shift(month, 1)}`} aria-label={t("reports.next")} className="btn-secondary w-14 px-0">
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <span className="w-14" />
        )}
      </nav>

      {!total ? <p className="card px-4 py-6 text-center text-muted">{t("reports.empty")}</p> : null}

      {total ? (
        <section className="card space-y-4 p-5" aria-labelledby="report-total">
          <div>
            <h3 id="report-total" className="text-base font-semibold text-muted">
              {t("reports.allVehicles")}
            </h3>
            <p className="text-sm text-muted">{t("reports.profit")}</p>
            <p className={`text-4xl font-bold tabular-nums ${(total.profit ?? 0) < 0 ? "text-danger" : ""}`}>{inr(total.profit)}</p>
          </div>
          {stats(total)}
        </section>
      ) : null}

      <ul className="space-y-3">
        {rows.map((r) => {
          const v = r.vehicle_id ? regs.get(r.vehicle_id) : undefined;
          return (
            <li key={r.vehicle_id} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/vehicles/${r.vehicle_id}`} className="flex min-h-12 items-center text-lg font-bold text-brand">
                    {v ? formatReg(v.reg_number) : ""}
                  </Link>
                  {v?.nickname ? <p className="-mt-2 truncate text-sm text-muted">{v.nickname}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-muted">{t("reports.profit")}</p>
                  <p className={`text-xl font-bold tabular-nums ${(r.profit ?? 0) < 0 ? "text-danger" : ""}`}>{inr(r.profit)}</p>
                </div>
              </div>
              {stats(r)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
