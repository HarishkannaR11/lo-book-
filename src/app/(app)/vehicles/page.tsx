import { getFormatter, getTranslations } from "next-intl/server";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/trip-schemas";

export default async function Vehicles() {
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, reg_number, nickname, is_active, vehicle_documents(doc_type, expires_on)")
    .eq("is_active", true)
    .order("created_at");
  if (error) throw new Error(error.message);
  const today = todayIST();

  return (
    <div className="space-y-5">
      <PageHeader title={t("vehicles.title")} />
      {data.length === 0 ? <p className="card px-4 py-6 text-center text-muted">{t("vehicles.empty")}</p> : null}
      <ul className="card divide-y divide-line overflow-hidden">
        {data.map((v) => {
          const docs = [...v.vehicle_documents].sort((a, b) => (a.expires_on < b.expires_on ? -1 : 1));
          const next = docs[0];
          const subtitle = !next
            ? t("documents.noneAdded")
            : t(next.expires_on < today ? "documents.nextExpired" : "documents.nextDue", {
                doc: t(`documents.types.${next.doc_type}`),
                date: format.dateTime(new Date(next.expires_on), "short"),
              });
          return (
            <li key={v.id}>
              <ListRow href={`/vehicles/${v.id}`} title={formatReg(v.reg_number)} subtitle={v.nickname ? t("documents.withNickname", { nickname: v.nickname, status: subtitle }) : subtitle} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
