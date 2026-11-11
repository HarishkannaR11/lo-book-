import { getTranslations } from "next-intl/server";
import { DriverForm } from "@/components/masters/driver-form";
import { countRows, DriverList } from "@/components/masters/lists";
import { requireOwner } from "@/lib/owner";
import { OnboardingStep } from "../step";

export default async function OnboardingDrivers() {
  await requireOwner();
  const t = await getTranslations();
  const count = await countRows("drivers");
  return (
    <OnboardingStep
      step={3}
      title={t("onboarding.driversTitle")}
      intro={t("onboarding.driversIntro")}
      next={{ href: "/onboarding/parties", label: count > 0 ? t("common.next") : t("common.skip") }}
    >
      <DriverForm />
      <DriverList editable={false} />
    </OnboardingStep>
  );
}
