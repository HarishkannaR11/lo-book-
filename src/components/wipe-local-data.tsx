"use client";

import { useEffect } from "react";
import { clearLocalData } from "@/lib/offline/sync";

/** After an account is deleted: remove the phone's copy of its entries and cached pages. */
export function WipeLocalData() {
  useEffect(() => {
    void clearLocalData().finally(() => navigator.serviceWorker?.controller?.postMessage({ type: "signout" }));
  }, []);
  return null;
}
