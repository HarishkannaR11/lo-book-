import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";
import { PageHeader } from "@/components/ui/page-header";

// The quick-add fill screen. Works offline; OCR runs on the phone.
export default async function NewExpense() {
  const t = await getTranslations("expense");
  return (
    <div>
      <PageHeader title={t("title")} backHref="/" />
      <Suspense>
        <NewExpenseForm />
      </Suspense>
    </div>
  );
}
