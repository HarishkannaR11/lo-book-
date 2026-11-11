import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteDriver } from "@/app/actions/masters";
import { DeleteForm } from "@/components/masters/delete-form";
import { DriverForm } from "@/components/masters/driver-form";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export default async function EditDriver({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, name, phone, licence_number, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!driver) notFound();

  const t = await getTranslations("drivers");
  return (
    <div className="space-y-8">
      <PageHeader title={t("editTitle")} backHref="/settings/drivers" />
      <DriverForm driver={driver} />
      <DeleteForm id={driver.id} action={deleteDriver} />
    </div>
  );
}
