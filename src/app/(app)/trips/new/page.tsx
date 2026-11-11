import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { NewTripForm } from "@/components/trips/new-trip-form";
import { PageHeader } from "@/components/ui/page-header";

// Works offline: the form reads vehicles, drivers and parties from the phone's own store.
export default async function NewTrip() {
  const t = await getTranslations("newTrip");
  return (
    <div>
      <PageHeader title={t("title")} backHref="/trips" />
      <Suspense>
        <NewTripForm />
      </Suspense>
    </div>
  );
}
