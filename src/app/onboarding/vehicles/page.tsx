import { getTranslations } from "next-intl/server";
import { countRows, VehicleList } from "@/components/masters/lists";
import { VehicleForm } from "@/components/masters/vehicle-form";
import { requireOwner } from "@/lib/owner";
import { OnboardingStep } from "../step";

export default async function OnboardingVehicles() {
  await requireOwner();
  const t = await getTranslations();
  const count = await countRows("vehicles");
  return (
    <OnboardingStep
      step={2}
      title={t("onboarding.vehiclesTitle")}
      intro={t("onboarding.vehiclesIntro")}
      next={{ href: "/onboarding/drivers", label: count > 0 ? t("common.next") : t("common.skip") }}
    >
      <VehicleForm />
      <VehicleList editable={false} />
    </OnboardingStep>
  );
}
