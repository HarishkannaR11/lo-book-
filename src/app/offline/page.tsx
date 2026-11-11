import { getTranslations } from "next-intl/server";

// Precached by the service worker and shown when a page can't load. Rendered statically in
// both languages because the cached copy can't know which one the owner picked later.
export const dynamic = "force-static";

export default async function OfflinePage() {
  const tTa = await getTranslations({ locale: "ta", namespace: "offline" });
  const tEn = await getTranslations({ locale: "en", namespace: "offline" });
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <svg aria-hidden viewBox="0 0 24 24" className="size-14 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
      </svg>
      <section lang="ta" className="space-y-1">
        <h1 className="text-2xl font-bold">{tTa("title")}</h1>
        <p className="text-muted">{tTa("body")}</p>
      </section>
      <section lang="en" className="space-y-1">
        <h2 className="text-xl font-bold">{tEn("title")}</h2>
        <p className="text-muted">{tEn("body")}</p>
      </section>
      {/* A full page load, not <Link>: it lets the service worker retry the network. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn-primary">
        <span lang="ta">{tTa("retry")}</span>
        <span aria-hidden>·</span>
        <span lang="en">{tEn("retry")}</span>
      </a>
    </main>
  );
}
