import { getTranslations } from "next-intl/server";
import { countRows, PartyList } from "@/components/masters/lists";
import { PartyForm } from "@/components/masters/party-form";
import { requireOwner } from "@/lib/owner";
import { OnboardingStep } from "../step";

export default async function OnboardingParties() {
  await requireOwner();
  const t = await getTranslations();
  const count = await countRows("parties");
  return (
    <OnboardingStep
      step={4}
      title={t("onboarding.partiesTitle")}
      intro={t("onboarding.partiesIntro")}
      next={{ href: "/", label: count > 0 ? t("onboarding.finish") : t("common.skip") }}
    >
      <PartyForm />
      <PartyList editable={false} />
    </OnboardingStep>
  );
}
