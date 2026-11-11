"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { PhotoField } from "@/components/ocr/photo-field";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { TextField } from "@/components/ui/text-field";
import type { ErrorCode } from "@/lib/errors";
import { formatReg } from "@/lib/format";
import { db } from "@/lib/offline/db";
import { saveExpenseLocally } from "@/lib/offline/mutations";
import { EXPENSE_KINDS, expenseWire, toNumber, todayIST, type ExpenseKind } from "@/lib/trip-schemas";

type Field = "litres" | "amount" | "odometer" | "spent_on" | "trip_client_uuid";
type FromSlip = { fields: Set<"litres" | "amount" | "spent_on">; check: "litres" | "amount" | null; ok: boolean };

const isKind = (v: string | null): v is ExpenseKind => (EXPENSE_KINDS as readonly string[]).includes(v ?? "");

export function NewExpenseForm() {
  const t = useTranslations();
  const format = useFormatter();
  const params = useSearchParams();
  const tripParam = params.get("trip");
  const kindParam = params.get("kind");

  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const openTrips = useLiveQuery(() => db.trips.where("status").equals("open").toArray(), [], []);
  const preselected = openTrips.find((tr) => tr.client_uuid === tripParam);
  const lastVehicle = useLiveQuery(async () => (await db.meta.get("lastExpenseVehicle"))?.value ?? "", [], "");

  const [chosenVehicle, setChosenVehicle] = useState<string | null>(null);
  const [kind, setKind] = useState<ExpenseKind>(isKind(kindParam) ? kindParam : "diesel");
  const [values, setValues] = useState({ litres: "", amount: "", odometer: "", spent_on: todayIST() });
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [fromSlip, setFromSlip] = useState<FromSlip | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, ErrorCode>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  if (vehicles === undefined) return null;

  const vehicleId = chosenVehicle ?? preselected?.vehicle_id ?? (vehicles.some((v) => v.id === lastVehicle) ? lastVehicle : vehicles[0]?.id ?? "");
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const trip = preselected && preselected.vehicle_id === vehicleId
    ? preselected
    : openTrips.filter((tr) => tr.vehicle_id === vehicleId).sort((a, b) => (a.started_on < b.started_on ? 1 : -1))[0];
  const isDiesel = kind === "diesel";

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setFromSlip((s) => (s && (k === "litres" || k === "amount" || k === "spent_on") ? { ...s, fields: new Set([...s.fields].filter((f) => f !== k)) } : s));
  };

  async function onPhoto(file: File) {
    const { compressPhoto, readSlip } = await import("@/lib/ocr/engine");
    setPhoto(await compressPhoto(file));
    if (!isDiesel) return;
    try {
      const r = await readSlip(file);
      const fields = new Set<"litres" | "amount" | "spent_on">();
      const next = { ...values };
      if (r.litres !== null) {
        next.litres = String(r.litres);
        fields.add("litres");
      }
      if (r.amount !== null) {
        next.amount = String(r.amount);
        fields.add("amount");
      }
      if (r.date && r.date <= todayIST()) {
        next.spent_on = r.date;
        fields.add("spent_on");
      }
      setValues(next);
      setFromSlip({ fields, check: r.repaired === "litres" || r.repaired === "amount" ? r.repaired : null, ok: r.consistent && fields.size > 0 });
    } catch {
      setFromSlip({ fields: new Set(), check: null, ok: false });
    }
  }

  async function onSubmit() {
    const odometer = toNumber(values.odometer);
    const candidate = {
      client_uuid: crypto.randomUUID(),
      trip_client_uuid: trip?.client_uuid ?? "",
      kind,
      amount: toNumber(values.amount),
      litres: isDiesel ? toNumber(values.litres) : null,
      odometer,
      spent_on: values.spent_on,
    };
    const parsed = expenseWire.safeParse(candidate);
    const next: Partial<Record<Field, ErrorCode>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[issue.path[0] as Field] ??= issue.message as ErrorCode;
    }
    if (candidate.amount === null) next.amount = "required";
    if (isDiesel && candidate.litres === null) next.litres = "required";
    if (odometer !== null && trip && odometer < trip.start_odometer) next.odometer = "odometerTooLow";
    if (values.spent_on > todayIST()) next.spent_on = "dateInvalid";
    if (!parsed.success || Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    await saveExpenseLocally(parsed.data, photo);
    await db.meta.put({ key: "lastExpenseVehicle", value: vehicleId });
    setSaved(
      t(navigator.onLine ? "expense.saved" : "expense.savedOffline", {
        kind: t(`kinds.${kind}`),
        amount: format.number(parsed.data.amount, "inr"),
        reg: vehicle ? formatReg(vehicle.reg_number) : "",
      }),
    );
    setValues((v) => ({ litres: "", amount: "", odometer: "", spent_on: v.spent_on }));
    setPhoto(null);
    setFromSlip(null);
    setErrors({});
  }

  const slipNote = (f: "litres" | "amount" | "spent_on") =>
    fromSlip?.fields.has(f) ? (fromSlip.check === f ? t("expense.checkThis") : t("expense.fromSlip")) : undefined;
  const slipClass = (f: "litres" | "amount" | "spent_on") =>
    fromSlip?.fields.has(f) ? (fromSlip.check === f ? "input border-danger bg-danger-soft" : "input border-ok bg-ok-soft") : "input";

  return (
    <form action={onSubmit} noValidate className="space-y-6">
      <ChoiceGroup
        name="vehicle"
        legend={t("expense.vehicle")}
        choices={vehicles.map((v) => ({ value: v.id, label: formatReg(v.reg_number), sub: v.nickname }))}
        value={vehicleId}
        onChange={(v) => {
          setChosenVehicle(v);
          setSaved(null);
        }}
      />

      {trip ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3 text-brand-ink">
          {t("expense.onTrip", { route: t("trips.route", { from: trip.from_place, to: trip.to_place }) })}
        </p>
      ) : (
        <div role="alert" className="space-y-3 rounded-xl bg-danger-soft px-4 py-3 text-danger">
          <p className="font-semibold">{t("errors.noOpenTrip")}</p>
          <Link href={`/trips/new?vehicle=${vehicleId}`} className="btn-primary">
            {t("trips.new")}
          </Link>
        </div>
      )}

      <ChoiceGroup
        name="kind"
        legend={t("expense.kind")}
        columns={3}
        choices={EXPENSE_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
        value={kind}
        onChange={(k) => isKind(k) && setKind(k)}
      />

      <PhotoField
        label={isDiesel ? t("expense.photoSlip") : t("expense.photoBill")}
        hint={isDiesel ? t("expense.photoSlipHint") : t("expense.photoBillHint")}
        busyLabel={t("expense.reading")}
        removeLabel={t("expense.removePhoto")}
        photo={photo}
        onPhoto={onPhoto}
        onRemove={() => setPhoto(null)}
      />
      {fromSlip ? (
        <p role="status" className={`rounded-xl px-4 py-3 font-semibold ${fromSlip.ok && !fromSlip.check ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          {!fromSlip.ok ? t("expense.readFailed") : fromSlip.check ? t("expense.readCheck", { field: t(`expense.${fromSlip.check}`) }) : t("expense.readOk")}
        </p>
      ) : null}

      <div className={`grid gap-3 ${isDiesel ? "grid-cols-2" : "grid-cols-1"}`}>
        {isDiesel ? (
          <TextField name="litres" label={t("expense.litres")} inputMode="decimal" value={values.litres} onChange={set("litres")} error={errors.litres} hint={slipNote("litres")} className={slipClass("litres")} autoComplete="off" enterKeyHint="next" maxLength={8} />
        ) : null}
        <TextField name="amount" label={t("expense.amount")} inputMode="decimal" value={values.amount} onChange={set("amount")} error={errors.amount} hint={slipNote("amount")} className={slipClass("amount")} autoComplete="off" enterKeyHint="next" maxLength={12} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="odometer"
          label={t("expense.odometer")}
          inputMode="numeric"
          value={values.odometer}
          onChange={set("odometer")}
          error={errors.odometer}
          optional
          placeholder={vehicle?.last_odometer != null ? String(vehicle.last_odometer) : undefined}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={8}
        />
        <TextField name="spent_on" type="date" label={t("expense.date")} value={values.spent_on} max={todayIST()} onChange={set("spent_on")} error={errors.spent_on} hint={slipNote("spent_on")} className={slipClass("spent_on")} />
      </div>

      {saved ? (
        <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 font-semibold text-ok">
          {saved}
        </p>
      ) : null}
      <button type="submit" className="btn-primary min-h-16 text-xl" disabled={!trip}>
        {t("expense.save")}
      </button>
      {trip ? (
        <Link href={`/trips/${trip.client_uuid}`} className="btn-secondary">
          {t("expense.done")}
        </Link>
      ) : null}
    </form>
  );
}
