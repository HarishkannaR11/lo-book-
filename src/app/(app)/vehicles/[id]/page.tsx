import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { MileageChart, type MileagePoint } from "@/components/vehicles/mileage-chart";
import { DOC_TYPES } from "@/lib/documents";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const [vehicle, mileage, alerts] = await Promise.all([
    supabase.from("vehicles").select("id, reg_number, nickname, vehicle_documents(doc_type, expires_on)").eq("id", id).maybeSingle(),
    supabase
      .from("vehicle_trip_mileage")
      .select("client_uuid, ended_on, from_place, to_place, mileage_kmpl, usual_kmpl, vs_usual_pct, is_drop, recency")
      .eq("vehicle_id", id)
      .lte("recency", 10)
      .order("recency", { ascending: false }),
    supabase.from("document_alerts").select("doc_type, days_left").eq("vehicle_id", id),
  ]);
  const v = vehicle.data;
  if (!v) notFound();
  if (mileage.error || alerts.error) throw new Error((mileage.error ?? alerts.error)?.message);

  const t = await getTranslations();
  const format = await getFormatter();
  const byType = new Map(v.vehicle_documents.map((d) => [d.doc_type, d.expires_on]));
  const daysLeft = new Map(alerts.data.map((a) => [a.doc_type, a.days_left]));

  const points: MileagePoint[] = mileage.data.map((m) => ({
    id: m.client_uuid ?? "",
    from: m.from_place ?? "",
    to: m.to_place ?? "",
    kmpl: m.mileage_kmpl ?? 0,
    usual: m.usual_kmpl,
    drop: m.is_drop ?? false,
    dateLabel: format.dateTime(new Date(m.ended_on ?? ""), "dayMonth"),
    kmplLabel: format.number(m.mileage_kmpl ?? 0, "plain"),
    usualLabel: m.usual_kmpl === null ? null : format.number(m.usual_kmpl, "plain"),
    vsUsualLabel: m.vs_usual_pct === null ? null : format.number(m.vs_usual_pct, "pct"),
  }));
  const latest = mileage.data.at(-1);

  return (
    <div className="space-y-6">
      <PageHeader title={formatReg(v.reg_number)} backHref="/vehicles" />
      {v.nickname ? <p className="-mt-4 text-muted">{v.nickname}</p> : null}

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-bold">{t("mileage.title")}</h2>
        {latest?.is_drop && latest.usual_kmpl !== null && latest.vs_usual_pct !== null && latest.mileage_kmpl !== null ? (
          <p role="status" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 font-semibold text-danger">
            <svg aria-hidden width="16" height="14" viewBox="0 0 16 14" className="mt-1 shrink-0">
              <path d="M1 2 L15 2 L8 13 Z" fill="currentColor" />
            </svg>
            <span>
              {t("mileage.downDetail", {
                value: format.number(latest.mileage_kmpl, "plain"),
                usual: format.number(latest.usual_kmpl, "plain"),
                pct: format.number(Math.abs(latest.vs_usual_pct), "plain"),
              })}
            </span>
          </p>
        ) : null}
        <MileageChart reg={formatReg(v.reg_number)} points={points} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("documents.title")}</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {DOC_TYPES.map((type) => {
            const exp = byType.get(type);
            const left = daysLeft.get(type);
            const expired = left !== undefined && left !== null && left < 0;
            const dueSoon = left !== undefined && left !== null && left >= 0;
            return (
              <li key={type}>
                <ListRow
                  href={`/vehicles/${v.id}/documents/${type}`}
                  title={t(`documents.types.${type}`)}
                  subtitle={
                    exp
                      ? t(expired ? "documents.expired" : "documents.validTill", { date: format.dateTime(new Date(exp), "short") })
                      : t("documents.notAdded")
                  }
                  badge={expired ? t("documents.expiredBadge") : dueSoon ? t("documents.dueSoon") : undefined}
                />
              </li>
            );
          })}
        </ul>
      </section>
      <Link href={`/settings/vehicles/${v.id}`} className="btn-secondary">
        {t("vehicles.editTitle")}
      </Link>
    </div>
  );
}
