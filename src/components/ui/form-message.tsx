import { useTranslations } from "next-intl";
import type { ErrorCode } from "@/lib/errors";

export function FormError({ error }: { error?: ErrorCode }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
      {t(error)}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  return (
    <p role="status" aria-live="polite" className={message ? "rounded-xl bg-ok-soft px-4 py-3 font-semibold text-ok" : "sr-only"}>
      {message ?? ""}
    </p>
  );
}
