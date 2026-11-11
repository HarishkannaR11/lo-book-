"use client";

import { useTranslations } from "next-intl";
import { slipPhotoUrl } from "@/app/actions/sync";

export function PhotoLink({ path }: { path: string }) {
  const t = useTranslations("trips");
  return (
    <button
      type="button"
      className="btn-link min-h-12 text-sm"
      onClick={async () => {
        const url = await slipPhotoUrl(path);
        if (url) window.open(url, "_blank", "noopener");
      }}
    >
      {t("photo")}
    </button>
  );
}
