"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { sendOtp, verifyOtp, type SendOtpState, type VerifyOtpState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { formatMobile } from "@/lib/format";

const RESEND_AFTER_SECONDS = 30;

export function LoginForm() {
  const t = useTranslations();
  const [sent, sendAction] = useActionState<SendOtpState, FormData>(sendOtp, { status: "idle" });
  const [verified, verifyAction] = useActionState<VerifyOtpState, FormData>(verifyOtp, { status: "idle" });
  // "Change number" hides the OTP step for the OTP that was just sent.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  if (sent.status === "sent" && sent.sentAt !== dismissedAt) {
    return (
      <div className="space-y-5">
        <form action={verifyAction} noValidate className="space-y-5">
          <input type="hidden" name="phone" value={sent.phone} />
          <TextField
            key={sent.sentAt}
            name="token"
            label={t("login.otpLabel")}
            hint={t("login.otpSentTo", { phone: `+91 ${formatMobile(sent.phone)}` })}
            error={verified.status === "error" ? verified.error : undefined}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            enterKeyHint="go"
            className="input text-center text-3xl tracking-[0.5em]"
          />
          <SubmitButton pendingLabel={t("login.verifying")}>{t("login.verify")}</SubmitButton>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn-link" onClick={() => setDismissedAt(sent.sentAt)}>
            {t("login.changeNumber")}
          </button>
          <ResendButton phone={sent.phone} sentAt={sent.sentAt} action={sendAction} />
        </div>
      </div>
    );
  }

  return (
    <form action={sendAction} noValidate className="space-y-5">
      <TextField
        name="phone"
        type="tel"
        label={t("login.phoneLabel")}
        prefix={t("login.phonePrefix")}
        placeholder={t("login.phonePlaceholder")}
        defaultValue={sent.status === "error" ? sent.phoneInput : sent.status === "sent" ? formatMobile(sent.phone) : ""}
        error={sent.status === "error" ? sent.error : undefined}
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        autoFocus
        enterKeyHint="send"
      />
      <SubmitButton pendingLabel={t("login.sending")}>{t("login.sendOtp")}</SubmitButton>
    </form>
  );
}

function ResendButton({ phone, sentAt, action }: { phone: string; sentAt: number; action: (formData: FormData) => void }) {
  const t = useTranslations("login");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const wait = Math.max(0, RESEND_AFTER_SECONDS - Math.floor((now - sentAt) / 1000));
  if (wait > 0) {
    return <span className="text-muted">{t("resendIn", { seconds: wait })}</span>;
  }
  return (
    <form action={action}>
      <input type="hidden" name="phone" value={formatMobile(phone)} />
      <button type="submit" className="btn-link">
        {t("resend")}
      </button>
    </form>
  );
}
