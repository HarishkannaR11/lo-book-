import Link from "next/link";
import { useTranslations } from "next-intl";

export function PageHeader({ title, backHref }: { title: string; backHref?: string }) {
  const t = useTranslations("common");
  return (
    <header className="mb-5 space-y-1">
      {backHref ? (
        <Link href={backHref} className="btn-link -ms-1 gap-1">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("back")}
        </Link>
      ) : null}
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}
