"use client";

import { useEffect, useState } from "react";

/**
 * Camera button. The photo is handed to the parent, which compresses it and runs on-device
 * OCR; this component only owns the busy state and the thumbnail.
 */
export function PhotoField({
  label,
  hint,
  busyLabel,
  removeLabel,
  photo,
  onPhoto,
  onRemove,
}: {
  label: string;
  hint: string;
  busyLabel: string;
  removeLabel: string;
  photo: Blob | null;
  onPhoto: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors an external object URL lifecycle
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [photo]);

  return (
    <div className="space-y-2">
      <label className={`btn-secondary has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand ${busy ? "opacity-60" : ""}`}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              await onPhoto(file);
            } finally {
              setBusy(false);
            }
          }}
        />
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        <span aria-live="polite">{busy ? busyLabel : label}</span>
      </label>
      <p className="text-sm text-muted">{hint}</p>
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimisable asset */}
          <img src={preview} alt="" className="size-16 rounded-lg border border-line object-cover" />
          <button type="button" className="btn-link" onClick={onRemove}>
            {removeLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
