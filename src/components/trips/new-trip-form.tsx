"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { TextField } from "@/components/ui/text-field";
import type { ErrorCode } from "@/lib/errors";
import { formatReg } from "@/lib/format";
import { db } from "@/lib/offline/db";
import { saveTripLocally } from "@/lib/offline/mutations";
import { syncNow } from "@/lib/offline/sync";
import { toNumber, todayIST, tripWire } from "@/lib/trip-schemas";

type Field = "vehicle_id" | "party_id" | "from_place" | "to_place" | "goods" | "freight_amount" | "advance_from_party" | "start_odometer";
const NO_DRIVER = "none";

export function NewTripForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const drivers = useLiveQuery(() => db.drivers.toArray(), [], []);
  const parties = useLiveQuery(() => db.parties.toArray(), [], []);
  const places = useLiveQuery(
    async () => [...new Set((await db.trips.toArray()).flatMap((tr) => [tr.from_place, tr.to_place]).filter(Boolean))].sort(),
    [],
    [],
  );

  const [vehicleId, setVehicleId] = useState(params.get("vehicle") ?? "");
  const [driverId, setDriverId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [odometer, setOdometer] = useState<string | null>(null); // null = not touched, use the vehicle's last reading
  const [errors, setErrors] = useState<Partial<Record<Field, ErrorCode>>>({});
  const [savedOffline, setSavedOffline] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (vehicles === undefined) return null; // first IndexedDB read, a few ms
  if (vehicles.length === 0 || parties.length === 0) {
    return (
      <div className="card space-y-4 p-5">
        <p className="text-lg">{t("newTrip.needMasters")}</p>
        <Link href={vehicles.length === 0 ? "/settings/vehicles" : "/settings/parties"} className="btn-primary">
          {t("newTrip.goToSettings")}
        </Link>
      </div>
    );
  }

  if (savedOffline) {
    return (
      <div className="card space-y-4 p-5" role="status">
        <p className="text-lg font-semibold">{t("newTrip.savedOffline")}</p>
        <Link href={`/expenses/new?trip=${savedOffline}`} className="btn-primary">
          {t("home.addDiesel")}
        </Link>
        <Link href="/" className="btn-secondary">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const lastOdo = vehicle?.last_odometer ?? null;
  const odometerValue = odometer ?? (lastOdo !== null ? String(lastOdo) : "");

  async function onSubmit(form: FormData) {
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const freight = toNumber(text("freight_amount"));
    const advance = toNumber(text("advance_from_party")) ?? 0;
    const start = toNumber(odometerValue);
    const candidate = {
      client_uuid: crypto.randomUUID(),
      vehicle_id: vehicleId,
      driver_id: driverId && driverId !== NO_DRIVER ? driverId : null,
      party_id: partyId,
      from_place: text("from_place"),
      to_place: text("to_place"),
      goods: text("goods") || null,
      freight_amount: freight,
      advance_from_party: advance,
      start_odometer: start,
      started_on: todayIST(),
    };
    const parsed = tripWire.safeParse(candidate);
    const next: Partial<Record<Field, ErrorCode>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as Field;
        next[f] ??= (issue.message as ErrorCode) || "generic";
      }
    }
    if (freight === null) next.freight_amount = "required";
    if (start === null) next.start_odometer = "required";
    else if (lastOdo !== null && start !== null && start < lastOdo) next.start_odometer = "odometerTooLow";
    if (!parsed.success || Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSaving(true);
    await saveTripLocally(parsed.data);
    if (navigator.onLine) {
      await syncNow();
      router.push(`/trips/${parsed.data.client_uuid}`);
    } else {
      setSavedOffline(parsed.data.client_uuid);
    }
  }

  return (
    <form action={onSubmit} noValidate className="space-y-6">
      <ChoiceGroup
        name="vehicle"
        legend={t("newTrip.vehicle")}
        choices={vehicles.map((v) => ({ value: v.id, label: formatReg(v.reg_number), sub: v.nickname }))}
        value={vehicleId}
        onChange={(v) => {
          setVehicleId(v);
          setOdometer(null);
        }}
        error={errors.vehicle_id}
      />
      <ChoiceGroup
        name="driver"
        legend={t("newTrip.driver")}
        choices={[...drivers.map((d) => ({ value: d.id, label: d.name })), { value: NO_DRIVER, label: t("newTrip.noDriver") }]}
        value={driverId}
        onChange={setDriverId}
      />
      <ChoiceGroup
        name="party"
        legend={t("newTrip.party")}
        choices={parties.map((p) => ({ value: p.id, label: p.name, sub: p.place }))}
        value={partyId}
        onChange={setPartyId}
        error={errors.party_id}
      />
      <datalist id="places">
        {places.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        <TextField name="from_place" label={t("newTrip.from")} list="places" error={errors.from_place} autoComplete="off" enterKeyHint="next" maxLength={80} />
        <TextField name="to_place" label={t("newTrip.to")} list="places" error={errors.to_place} autoComplete="off" enterKeyHint="next" maxLength={80} />
      </div>
      <TextField name="goods" label={t("newTrip.goods")} placeholder={t("newTrip.goodsPlaceholder")} optional error={errors.goods} autoComplete="off" enterKeyHint="next" maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="freight_amount" label={t("newTrip.freight")} inputMode="decimal" error={errors.freight_amount} autoComplete="off" enterKeyHint="next" maxLength={12} />
        <TextField name="advance_from_party" label={t("newTrip.advance")} inputMode="decimal" optional error={errors.advance_from_party} autoComplete="off" enterKeyHint="next" maxLength={12} />
      </div>
      <TextField
        name="start_odometer"
        label={t("newTrip.startOdometer")}
        inputMode="numeric"
        value={odometerValue}
        onChange={(e) => setOdometer(e.target.value)}
        hint={lastOdo !== null ? t("newTrip.startOdometerHint", { km: lastOdo }) : undefined}
        error={errors.start_odometer}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={8}
      />
      <button type="submit" className="btn-primary min-h-16 text-xl" disabled={saving}>
        {saving ? t("common.saving") : t("newTrip.save")}
      </button>
    </form>
  );
}
