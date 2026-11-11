"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { formatReg } from "@/lib/format";
import { db } from "@/lib/offline/db";

/** Trips created on this phone that the server hasn't confirmed yet. */
export function PendingTrips() {
  const t = useTranslations();
  const format = useFormatter();
  const rows = useLiveQuery(async () => {
    const trips = await db.trips.where("synced").equals(0).toArray();
    const vehicles = new Map((await db.vehicles.toArray()).map((v) => [v.id, v.reg_number]));
    return trips.map((tr) => ({ ...tr, reg: vehicles.get(tr.vehicle_id) ?? "" }));
  }, []);
  if (!rows?.length) return null;
  return (
    <ul className="space-y-2">
      {rows.map((tr) => (
        <li key={tr.client_uuid}>
          <Link href={`/trips/${tr.client_uuid}`} className="card block space-y-0.5 border-dashed p-4">
            <span className="block text-lg font-semibold">{formatReg(tr.reg)}</span>
            <span className="block">{t("trips.route", { from: tr.from_place, to: tr.to_place })}</span>
            <span className="block text-sm font-semibold text-brand">
              {t("trips.waitingOn", { date: format.dateTime(new Date(tr.started_on), "short") })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Expenses for this trip still on the phone. Listed, but not added to the server's total. */
export function PendingExpenses({ tripClientUuid }: { tripClientUuid: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const rows = useLiveQuery(() => db.expenses.where("trip_client_uuid").equals(tripClientUuid).sortBy("created_at"), [tripClientUuid]);
  if (!rows?.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-brand">{t("trips.notCounted", { count: rows.length })}</h2>
      <ul className="card divide-y divide-line border-dashed">
        {rows.map((x) => (
          <li key={x.client_uuid} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <span className="flex-1">
              <span className="block font-semibold">{t(`kinds.${x.kind}`)}</span>
              {x.litres ? <span className="block text-sm text-muted">{t("trips.litres", { litres: x.litres })}</span> : null}
            </span>
            <span className="font-semibold tabular-nums">{format.number(x.amount, "inr")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A trip that so far exists only on this phone (created offline). */
export function LocalTripView({ clientUuid }: { clientUuid: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const trip = useLiveQuery(() => db.trips.get(clientUuid), [clientUuid], null);
  const vehicle = useLiveQuery(async () => (trip ? db.vehicles.get(trip.vehicle_id) : undefined), [trip?.vehicle_id]);
  if (trip === null) return null;
  if (!trip) return <p className="card p-5 text-lg">{t("trips.notFound")}</p>;
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm font-semibold text-brand">{t("trips.waiting")}</p>
        <h1 className="text-2xl font-bold">{vehicle ? formatReg(vehicle.reg_number) : ""}</h1>
        <p className="text-lg">{t("trips.route", { from: trip.from_place, to: trip.to_place })}</p>
        <p className="text-muted">{t("trips.freightLine", { amount: format.number(trip.freight_amount, "inr") })}</p>
      </header>
      <PendingExpenses tripClientUuid={clientUuid} />
      {trip.status === "open" ? (
        <Link href={`/expenses/new?trip=${clientUuid}`} className="btn-primary min-h-16 text-xl">
          {t("home.addDiesel")}
        </Link>
      ) : null}
    </div>
  );
}
