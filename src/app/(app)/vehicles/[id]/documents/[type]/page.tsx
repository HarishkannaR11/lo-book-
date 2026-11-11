import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DOC_TYPES } from "@/lib/documents";
import { DocumentForm } from "@/components/vehicles/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { formatReg } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

type DocType = (typeof DOC_TYPES)[number];
const isDocType = (s: string): s is DocType => (DOC_TYPES as readonly string[]).includes(s);

export default async function DocumentPage({ params }: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await params;
  if (!uuid.safeParse(id).success || !isDocType(type)) notFound();
  const supabase = await createClient();
  const { data: v } = await supabase.from("vehicles").select("id, reg_number").eq("id", id).maybeSingle();
  if (!v) notFound();
  const { data: doc } = await supabase
    .from("vehicle_documents")
    .select("expires_on, file_url")
    .eq("vehicle_id", id)
    .eq("doc_type", type)
    .maybeSingle();
  const t = await getTranslations();

  return (
    <div>
      <PageHeader title={t(`documents.types.${type}`)} backHref={`/vehicles/${id}`} />
      <p className="-mt-3 mb-5 text-muted">{formatReg(v.reg_number)}</p>
      <DocumentForm vehicleId={id} docType={type} expiresOn={doc?.expires_on ?? null} hasPhoto={Boolean(doc?.file_url)} />
    </div>
  );
}
