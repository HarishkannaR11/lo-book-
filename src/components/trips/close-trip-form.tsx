"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { TextField } from "@/components/ui/text-field";
import type { ErrorCode } from "@/lib/errors";
import { closeTripLocally } from "@/lib/offline/mutations";
import { toNumber, todayIST } from "@/lib/trip-schemas";

/** Asks for one thing only: the end odometer. */
export function CloseTripForm({ clientUuid, startOdometer, minOdometer }: { clientUuid: string; startOdometer: number | null; minOdometer: number }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<ErrorCode | undefined>();
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);

  if (queued) {
    return (
      <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 font-semibold text-brand-ink">
        {t("trips.closeQueued")}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="space-y-3"
      action={async (form) => {
        const end = toNumber(String(form.get("end_odometer") ?? ""));
        if (end === null) return setError("required");
        if (Number.isNaN(end) || !Number.isInteger(end)) return setError("odometerInvalid");
        if (end < minOdometer) return setError("odometerTooLow");
        setBusy(true);
        const landed = await closeTripLocally({ trip_client_uuid: clientUuid, end_odometer: end, ended_on: todayIST() });
        if (landed) router.push(`/trips/${clientUuid}/result`);
        else setQueued(true);
        setBusy(false);
      }}
    >
      <TextField
        name="end_odometer"
        label={t("trips.endOdometer")}
        inputMode="numeric"
        hint={startOdometer !== null ? t("trips.endOdometerHint", { km: startOdometer }) : undefined}
        error={error}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={8}
      />
      <button type="submit" className="btn-primary min-h-16 text-xl" disabled={busy}>
        {busy ? t("common.saving") : t("trips.close")}
      </button>
    </form>
  );
}
