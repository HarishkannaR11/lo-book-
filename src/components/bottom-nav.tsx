"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const items = [
  {
    href: "/",
    key: "home",
    icon: "M3 11.5L12 4l9 7.5M5.5 9.5V20h5v-6h3v6h5V9.5",
    match: (p: string) => p === "/",
  },
  {
    href: "/trips",
    key: "trips",
    icon: "M3 16V7h11v9M14 10h4l3 3v3h-7M3 16h18M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    match: (p: string) => p.startsWith("/trips") || p.startsWith("/expenses"),
  },
  {
    href: "/parties",
    key: "parties",
    icon: "M4 5h13a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3zM8 10h8M8 14h5",
    match: (p: string) => p.startsWith("/parties"),
  },
  {
    href: "/vehicles",
    key: "vehicles",
    icon: "M7 3h10l1 4H6zM6 7h12v11H6zM9 11h6M9 14h6",
    match: (p: string) => p.startsWith("/vehicles"),
  },
  {
    href: "/settings",
    key: "settings",
    icon: "M4 7h10M18 7h2M4 17h4M12 17h8M16 4v6M10 14v6",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-brand" : "text-muted"}`}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
