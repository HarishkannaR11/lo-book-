import { getTranslations } from "next-intl/server";
import { ListRow } from "@/components/ui/list-row";
import { formatMobile, formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function Empty({ text }: { text: string }) {
  return <p className="card px-4 py-6 text-center text-muted">{text}</p>;
}

export async function VehicleList({ editable }: { editable: boolean }) {
  const t = await getTranslations();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, reg_number, nickname, is_active")
    .order("is_active", { ascending: false })
    .order("created_at");
  if (error) throw new Error(error.message);
  if (data.length === 0) return <Empty text={t("vehicles.empty")} />;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {data.map((v) => (
        <li key={v.id}>
          <ListRow
            href={editable ? `/settings/vehicles/${v.id}` : undefined}
            title={formatReg(v.reg_number)}
            subtitle={v.nickname}
            badge={v.is_active ? undefined : t("common.notInUse")}
          />
        </li>
      ))}
    </ul>
  );
}

export async function DriverList({ editable }: { editable: boolean }) {
  const t = await getTranslations();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, phone, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  if (data.length === 0) return <Empty text={t("drivers.empty")} />;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {data.map((d) => (
        <li key={d.id}>
          <ListRow
            href={editable ? `/settings/drivers/${d.id}` : undefined}
            title={d.name}
            subtitle={formatMobile(d.phone)}
            badge={d.is_active ? undefined : t("common.notInUse")}
          />
        </li>
      ))}
    </ul>
  );
}

export async function PartyList({ editable }: { editable: boolean }) {
  const t = await getTranslations();
  const supabase = await createClient();
  const { data, error } = await supabase.from("parties").select("id, name, place").order("name");
  if (error) throw new Error(error.message);
  if (data.length === 0) return <Empty text={t("parties.empty")} />;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {data.map((p) => (
        <li key={p.id}>
          <ListRow href={editable ? `/settings/parties/${p.id}` : undefined} title={p.name} subtitle={p.place} />
        </li>
      ))}
    </ul>
  );
}

export async function countRows(table: "vehicles" | "drivers" | "parties"): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}
