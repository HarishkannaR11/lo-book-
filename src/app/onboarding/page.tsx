import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOwner } from "@/lib/owner";
import { OwnerForm } from "./owner-form";
import { OnboardingStep } from "./step";

export default async function OnboardingDetails() {
  if (await getOwner()) redirect("/");
  const t = await getTranslations("onboarding");
  return (
    <OnboardingStep step={1} title={t("detailsTitle")} intro={t("detailsIntro")}>
      <OwnerForm />
    </OnboardingStep>
  );
}
