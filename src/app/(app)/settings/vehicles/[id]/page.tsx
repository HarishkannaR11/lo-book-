import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteVehicle } from "@/app/actions/masters";
import { DeleteForm } from "@/components/masters/delete-form";
import { VehicleForm } from "@/components/masters/vehicle-form";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export default async function EditVehicle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, reg_number, nickname, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!vehicle) notFound();

  const t = await getTranslations("vehicles");
  return (
    <div className="space-y-8">
      <PageHeader title={t("editTitle")} backHref="/settings/vehicles" />
      <VehicleForm vehicle={vehicle} />
      <DeleteForm id={vehicle.id} action={deleteVehicle} />
    </div>
  );
}
