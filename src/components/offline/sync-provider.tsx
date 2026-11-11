"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onSynced, syncNow } from "@/lib/offline/sync";

const OCR_WARM_KEY = "ocr-warm-v1";

/**
 * Mounted once in the signed-in shell. Syncs on open, when signal returns and when the app
 * comes back to the foreground; refreshes server-rendered numbers after anything lands.
 * Also asks the service worker to keep the offline screens cached for this user, and
 * pre-loads the OCR engine once so the first scan works at a bunk with no signal.
 */
export function SyncProvider() {
  const router = useRouter();

  useEffect(() => {
    const off = onSynced(({ pushed }) => {
      if (pushed > 0) router.refresh();
    });
    const run = () => {
      if (!navigator.onLine) return;
      void syncNow();
      navigator.serviceWorker?.controller?.postMessage({ type: "warm" });
    };
    const onVisible = () => document.visibilityState === "visible" && run();

    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    void navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage({ type: "warm" }));

    let idle: number | undefined;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!connection?.saveData && localStorage.getItem(OCR_WARM_KEY) !== "1") {
      idle = window.setTimeout(() => {
        void import("@/lib/ocr/engine")
          .then((m) => m.warmOcr())
          .then(() => localStorage.setItem(OCR_WARM_KEY, "1"))
          .catch(() => undefined);
      }, 4000);
    }

    return () => {
      off();
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      if (idle) window.clearTimeout(idle);
    };
  }, [router]);

  return null;
}
