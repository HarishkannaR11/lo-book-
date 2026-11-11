import { getTranslations } from "next-intl/server";
import { VehicleList } from "@/components/masters/lists";
import { VehicleForm } from "@/components/masters/vehicle-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function VehiclesSettings() {
  const t = await getTranslations("vehicles");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} backHref="/settings" />
      <VehicleForm />
      <VehicleList editable />
    </div>
  );
}
