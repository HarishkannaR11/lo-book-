import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Link href="/" className="btn-primary">
        {t("home")}
      </Link>
    </main>
  );
}
