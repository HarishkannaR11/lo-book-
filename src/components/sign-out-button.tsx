"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { signOut } from "@/app/actions/auth";
import { db } from "@/lib/offline/db";
import { clearLocalData } from "@/lib/offline/sync";

/** Warns before throwing away entries that haven't reached the server, then wipes the phone's copy. */
export function SignOutButton() {
  const t = useTranslations("common");
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={signOut}>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          const pending = await db.outbox.count();
          if (pending > 0 && !window.confirm(t("signOutPending", { count: pending }))) return;
          await clearLocalData();
          navigator.serviceWorker?.controller?.postMessage({ type: "signout" });
          form.current?.requestSubmit();
        }}
      >
        {t("signOut")}
      </button>
    </form>
  );
}
