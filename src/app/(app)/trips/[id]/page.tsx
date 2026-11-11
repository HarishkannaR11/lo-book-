import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { CloseTripForm } from "@/components/trips/close-trip-form";
import { LocalTripView, PendingExpenses } from "@/components/trips/pending";
import { PhotoLink } from "@/components/trips/photo-link";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

// Trip URLs use the phone-minted client_uuid, so a trip created offline keeps its address.
export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();

  const { data: trip, error } = await supabase.from("trip_summary").select("*").eq("client_uuid", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!trip?.trip_id) {
    return (
      <div>
        <PageHeader title={t("trips.title")} backHref="/trips" />
        <LocalTripView clientUuid={id} />
      </div>
    );
  }

  const { data: expenses, error: exError } = await supabase
    .from("trip_expenses")
    .select("client_uuid, kind, amount, litres, odometer, spent_on, photo_url")
    .eq("trip_id", trip.trip_id)
    .order("spent_on")
    .order("created_at");
  if (exError) throw new Error(exError.message);
  const maxOdo = Math.max(trip.start_odometer ?? 0, ...expenses.map((x) => x.odometer ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title={formatReg(trip.vehicle_reg ?? "")} backHref="/trips" />
      <section className="-mt-3 space-y-0.5">
        <p className="text-lg font-semibold">{t("trips.route", { from: trip.from_place ?? "", to: trip.to_place ?? "" })}</p>
        <p className="text-muted">{t("trips.partyLine", { party: trip.party_name ?? "", driver: trip.driver_name ?? t("newTrip.noDriver") })}</p>
      </section>

      <section className="card grid grid-cols-2 divide-x divide-line">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted">{t("trips.freight")}</h2>
          <p className="text-2xl font-bold tabular-nums">{format.number(trip.freight_amount ?? 0, "inr")}</p>
        </div>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted">{t("trips.spentSoFar")}</h2>
          <p className="text-2xl font-bold tabular-nums">{format.number(trip.expense_total ?? 0, "inr")}</p>
        </div>
      </section>

      {trip.status === "open" ? (
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/expenses/new?trip=${id}`} className="btn-primary">
            {t("home.addDiesel")}
          </Link>
          <Link href={`/expenses/new?trip=${id}&kind=toll`} className="btn-secondary">
            {t("trips.addOther")}
          </Link>
        </div>
      ) : (
        <Link href={`/trips/${id}/result`} className="btn-primary min-h-16 text-xl">
          {t("trips.viewResult")}
        </Link>
      )}

      <PendingExpenses tripClientUuid={id} />

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("trips.expenses")}</h2>
        {expenses.length === 0 ? <p className="card px-4 py-5 text-muted">{t("trips.noExpenses")}</p> : null}
        <ul className="card divide-y divide-line overflow-hidden">
          {expenses.map((x) => (
            <li key={x.client_uuid} className="flex min-h-16 items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t(`kinds.${x.kind}`)}</span>
                <span className="block text-sm text-muted">
                  {[
                    format.dateTime(new Date(x.spent_on), "short"),
                    x.litres ? t("trips.litres", { litres: x.litres }) : null,
                    x.odometer ? t("trips.km", { km: x.odometer }) : null,
                  ]
                    .filter(Boolean)
                    .join(t("common.sep"))}
                </span>
                {x.photo_url ? <PhotoLink path={x.photo_url} /> : null}
              </span>
              <span className="text-lg font-semibold tabular-nums">{format.number(x.amount, "inr")}</span>
            </li>
          ))}
        </ul>
      </section>

      {trip.status === "open" ? (
        <section className="card space-y-3 p-4">
          <h2 className="text-lg font-bold">{t("trips.closeTitle")}</h2>
          <CloseTripForm clientUuid={id} startOdometer={trip.start_odometer} minOdometer={maxOdo} />
        </section>
      ) : null}
    </div>
  );
}
