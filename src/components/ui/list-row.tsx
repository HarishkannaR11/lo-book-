import Link from "next/link";

export function ListRow({
  href,
  title,
  subtitle,
  badge,
  tone,
}: {
  href?: string;
  title: string;
  subtitle?: string | null;
  badge?: string;
  tone?: "danger";
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold">{title}</span>
        {subtitle ? <span className="block truncate text-muted">{subtitle}</span> : null}
      </span>
      {badge ? (
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${tone === "danger" ? "bg-danger-soft text-danger" : "bg-canvas text-muted"}`}
        >
          {badge}
        </span>
      ) : null}
      {href ? (
        <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );
  const cls = "flex min-h-16 items-center gap-3 px-4 py-3";
  return href ? (
    <Link href={href} className={`${cls} active:bg-canvas`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
