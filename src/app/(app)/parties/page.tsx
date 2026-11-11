import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function Parties() {
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("party_outstanding")
    .select("party_id, name, place, outstanding")
    .order("outstanding", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-5">
      <PageHeader title={t("parties.title")} />
      {data.length === 0 ? (
        <div className="card space-y-4 p-5">
          <p className="text-muted">{t("parties.empty")}</p>
          <Link href="/settings/parties" className="btn-primary">
            {t("parties.add")}
          </Link>
        </div>
      ) : null}
      <ul className="card divide-y divide-line overflow-hidden">
        {data.map((p) => {
          const due = p.outstanding ?? 0;
          return (
            <li key={p.party_id}>
              <Link href={`/parties/${p.party_id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-canvas">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold">{p.name}</span>
                  {p.place ? <span className="block truncate text-muted">{p.place}</span> : null}
                </span>
                <span className={`text-lg font-bold tabular-nums ${due > 0 ? "" : "text-muted"}`}>
                  {due === 0 ? t("parties.settled") : format.number(due, "inr")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
