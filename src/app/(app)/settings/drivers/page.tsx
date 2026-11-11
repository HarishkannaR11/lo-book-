import { getTranslations } from "next-intl/server";
import { DriverForm } from "@/components/masters/driver-form";
import { DriverList } from "@/components/masters/lists";
import { PageHeader } from "@/components/ui/page-header";

export default async function DriversSettings() {
  const t = await getTranslations("drivers");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" />
      <DriverForm />
      <DriverList editable />
    </div>
  );
}
