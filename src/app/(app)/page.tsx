import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

// Two numbers, both straight from the owner_dashboard view, and two buttons. Nothing else.
export default async function Home() {
  const t = await getTranslations("home");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data, error } = await supabase.from("owner_dashboard").select("month_profit, total_outstanding").single();
  if (error) throw new Error(error.message);

  const profit = data.month_profit ?? 0;
  const outstanding = data.total_outstanding ?? 0;

  return (
    <div className="space-y-4">
      <section className="card space-y-1 p-5">
        <h2 className="text-base font-semibold text-muted">{t("monthProfit")}</h2>
        <p className={`text-4xl font-bold tabular-nums ${profit < 0 ? "text-danger" : "text-ink"}`}>
          {format.number(profit, "inr")}
        </p>
      </section>
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
