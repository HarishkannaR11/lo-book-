import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export const ONBOARDING_STEPS = 4;

export async function OnboardingStep({
  step,
  title,
  intro,
  next,
  children,
}: {
  step: number;
  title: string;
  intro: string;
  next?: { href: string; label: string };
  children: ReactNode;
}) {
  const t = await getTranslations("onboarding");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand">{t("stepOf", { step, total: ONBOARDING_STEPS })}</p>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
        <h1 className="pt-2 text-2xl font-bold">{title}</h1>
        <p className="text-muted">{intro}</p>
      </header>
      {children}
      {next ? (
        <Link href={next.href} className="btn-secondary">
          {next.label}
        </Link>
      ) : null}
    </div>
  );
}
