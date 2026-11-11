"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { db } from "@/lib/offline/db";
import { discardFailed } from "@/lib/offline/mutations";
import type { ErrorCode } from "@/lib/errors";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

const KNOWN: ErrorCode[] = ["syncRejected", "syncRejectedMissing", "photoInvalid"];

/** One line under the header: offline / waiting to sync / something the owner must look at. */
export function SyncStatus() {
  const t = useTranslations();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const waiting = useLiveQuery(() => db.outbox.where("failed").equals(0).count(), [], 0);
  const failed = useLiveQuery(() => db.outbox.where("failed").equals(1).toArray(), [], []);

  return (
    <div className="space-y-2" aria-live="polite">
      {!online || waiting > 0 ? (
        <p className={`rounded-xl px-4 py-2 text-sm font-semibold ${online ? "bg-brand-soft text-brand-ink" : "bg-canvas text-ink ring-1 ring-line"}`}>
          {online ? t("sync.sending", { count: waiting }) : t("sync.offline", { count: waiting })}
        </p>
      ) : null}
      {failed.map((item) => (
        <div key={item.seq} role="alert" className="flex items-center gap-3 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">
          <span className="flex-1 font-semibold">
            {t(`sync.failed.${item.type}`)} — {t(`errors.${KNOWN.includes(item.error as ErrorCode) ? (item.error as ErrorCode) : "syncRejected"}`)}
          </span>
          <button type="button" className="btn-link min-h-12 text-danger" onClick={() => item.seq && void discardFailed(item.seq)}>
            {t("sync.discard")}
          </button>
        </div>
      ))}
    </div>
  );
}
