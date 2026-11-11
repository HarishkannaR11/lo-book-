import { getTranslations } from "next-intl/server";
import { PartyList } from "@/components/masters/lists";
import { PartyForm } from "@/components/masters/party-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function PartiesSettings() {
  const t = await getTranslations("parties");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" />
      <PartyForm />
      <PartyList editable />
    </div>
  );
}
