import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { DOC_TYPES } from "@/lib/documents";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/trip-schemas";
import { uuid } from "@/lib/validation";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vehicles")
    .select("id, reg_number, nickname, vehicle_documents(doc_type, expires_on)")
    .eq("id", id)
    .maybeSingle();
  if (!v) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const today = todayIST();
  const byType = new Map(v.vehicle_documents.map((d) => [d.doc_type, d.expires_on]));

  return (
    <div className="space-y-5">
      <PageHeader title={formatReg(v.reg_number)} backHref="/vehicles" />
      {v.nickname ? <p className="-mt-3 text-muted">{v.nickname}</p> : null}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("documents.title")}</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {DOC_TYPES.map((type) => {
            const exp = byType.get(type);
            const expired = exp !== undefined && exp < today;
            return (
              <li key={type}>
                <ListRow
                  href={`/vehicles/${v.id}/documents/${type}`}
                  title={t(`documents.types.${type}`)}
                  subtitle={exp ? t(expired ? "documents.expired" : "documents.validTill", { date: format.dateTime(new Date(exp), "short") }) : t("documents.notAdded")}
                  badge={expired ? t("documents.expiredBadge") : undefined}
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
