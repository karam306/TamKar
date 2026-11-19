import Link from "next/link";

/** Page title row: back link, title, badges and buttons, like Shopify's admin. */
export function PageHeader({
  title,
  back,
  badges,
  actions,
}: {
  title: React.ReactNode;
  back?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {back && (
          <Link href={back} className="rounded-lg p-1 text-lg leading-none hover:bg-black/5" aria-label="رجوع">
            →
          </Link>
        )}
        <h1 className="text-xl font-bold">{title}</h1>
        {badges}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      {text && <p className="max-w-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 p-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline">
          →
        </Link>
      ) : (
        <span className="btn btn-outline opacity-40">→</span>
      )}
      <span className="text-muted">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-outline">
          ←
        </Link>
      ) : (
        <span className="btn btn-outline opacity-40">←</span>
      )}
    </div>
  );
}
