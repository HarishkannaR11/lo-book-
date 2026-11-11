import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteParty } from "@/app/actions/masters";
import { DeleteForm } from "@/components/masters/delete-form";
import { PartyForm } from "@/components/masters/party-form";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export default async function EditParty({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: party } = await supabase
    .from("parties")
    .select("id, name, phone, place, opening_balance")
    .eq("id", id)
    .maybeSingle();
  if (!party) notFound();

  const t = await getTranslations("parties");
  return (
    <div className="space-y-8">
      <PageHeader title={t("editTitle")} backHref="/settings/parties" />
      <PartyForm party={party} />
      <DeleteForm id={party.id} action={deleteParty} />
    </div>
  );
}
