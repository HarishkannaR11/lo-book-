"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { documentPhotoUrl, saveDocument, type DocState } from "@/app/actions/documents";
import { PhotoField } from "@/components/ocr/photo-field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { todayIST } from "@/lib/trip-schemas";

const idle: DocState = { status: "idle" };

/** Expiry date, typed or read off a photo of the certificate (OCR on the phone). */
export function DocumentForm({
  vehicleId,
  docType,
  expiresOn,
  hasPhoto,
}: {
  vehicleId: string;
  docType: string;
  expiresOn: string | null;
  hasPhoto: boolean;
}) {
  const t = useTranslations();
  const [state, action] = useActionState(saveDocument, idle);
  const [date, setDate] = useState(expiresOn ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [read, setRead] = useState<"ok" | "failed" | null>(null);

  async function onPhoto(file: File) {
    const { compressPhoto, readExpiry } = await import("@/lib/ocr/engine");
    setPhoto(await compressPhoto(file));
    try {
      const found = await readExpiry(file, todayIST());
      if (found) setDate(found);
      setRead(found ? "ok" : "failed");
    } catch {
      setRead("failed");
    }
  }

  return (
    <form
      noValidate
      className="space-y-5"
      action={(form) => {
        if (photo) form.set("photo", new File([photo], `${docType}.jpg`, { type: "image/jpeg" }));
        action(form);
      }}
    >
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <input type="hidden" name="doc_type" value={docType} />
      <PhotoField
        label={t("documents.photo")}
        hint={t("documents.photoHint")}
        busyLabel={t("documents.reading")}
        removeLabel={t("expense.removePhoto")}
        photo={photo}
        onPhoto={onPhoto}
        onRemove={() => setPhoto(null)}
      />
      {read ? (
        <p role="status" className={`rounded-xl px-4 py-3 font-semibold ${read === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          {read === "ok" ? t("documents.readOk") : t("documents.readFailed")}
        </p>
      ) : null}
      <TextField
        name="expires_on"
        type="date"
        label={t("documents.expiresOn")}
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          setRead(null);
        }}
        className={read === "ok" ? "input border-ok bg-ok-soft" : "input"}
      />
      {hasPhoto && !photo ? (
        <button
          type="button"
          className="btn-link"
          onClick={async () => {
            const url = await documentPhotoUrl(vehicleId, docType);
            if (url) window.open(url, "_blank", "noopener");
          }}
        >
          {t("documents.viewPhoto")}
        </button>
      ) : null}
      <FormError error={state.status === "error" ? state.error : undefined} />
      <SubmitButton pendingLabel={t("common.saving")}>{t("common.save")}</SubmitButton>
    </form>
  );
}
