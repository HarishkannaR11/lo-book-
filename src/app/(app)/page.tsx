import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ListRow } from "@/components/ui/list-row";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Two numbers from the owner_dashboard view and two buttons; documents due appear above them only when there are any.
export default async function Home() {
  const t = await getTranslations("home");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data, error } = await supabase.from("owner_dashboard").select("month_profit, total_outstanding").single();
  if (error) throw new Error(error.message);

  const profit = data.month_profit ?? 0;
  const outstanding = data.total_outstanding ?? 0;
  // Documents expired or expiring within 30 days, from the document_alerts view.
  const { data: alerts, error: alertsError } = await supabase
    .from("document_alerts")
    .select("vehicle_id, reg_number, doc_type, expires_on, days_left")
    .order("days_left");
  if (alertsError) throw new Error(alertsError.message);
  const tAll = await getTranslations();
  const due = alerts.filter((a) => a.doc_type !== null && a.vehicle_id !== null);

  return (
    <div className="space-y-4">
      {due.length > 0 ? (
        <section className="space-y-2" aria-labelledby="docs-due">
          <h2 id="docs-due" className="flex items-center gap-2 text-base font-bold text-danger">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3l9.5 17h-19z" strokeLinejoin="round" />
              <path d="M12 10v4M12 17.5v.01" strokeLinecap="round" />
            </svg>
            {t("docsDue")}
          </h2>
          <ul className="card divide-y divide-line overflow-hidden border-danger/40">
            {due.map((a) => {
              const expired = (a.days_left ?? 0) < 0;
              return (
                <li key={`${a.vehicle_id}-${a.doc_type}`}>
                  <ListRow
                    href={`/vehicles/${a.vehicle_id}/documents/${a.doc_type}`}
                    title={tAll("documents.withNickname", {
                      nickname: a.doc_type ? tAll(`documents.types.${a.doc_type}`) : "",
                      status: formatReg(a.reg_number ?? ""),
                    })}
                    subtitle={tAll(expired ? "documents.expired" : "documents.validTill", {
                      date: format.dateTime(new Date(a.expires_on ?? ""), "short"),
                    })}
                    badge={expired ? tAll("documents.expiredBadge") : tAll("documents.dueSoon")}
                    tone={expired ? "danger" : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <Link href="/reports" className="card block space-y-1 p-5 active:bg-canvas">
        <h2 className="text-base font-semibold text-muted">{t("monthProfit")}</h2>
        <p className={`text-4xl font-bold tabular-nums ${profit < 0 ? "text-danger" : "text-ink"}`}>
          {format.number(profit, "inr")}
        </p>
      </Link>
      <Link href="/parties" className="card block space-y-1 p-5 active:bg-canvas">
        <h2 className="text-base font-semibold text-muted">{t("outstanding")}</h2>
        <p className="text-4xl font-bold tabular-nums">{format.number(outstanding, "inr")}</p>
      </Link>
      <div className="grid gap-3 pt-2">
        <Link href="/trips/new" className="btn-primary min-h-20 text-xl">
          {t("newTrip")}
        </Link>
        <Link href="/expenses/new" className="btn-secondary min-h-20 text-xl">
          {t("addDiesel")}
        </Link>
      </div>
    </div>
  );
}
