import Link from "next/link";

export const PAGE_SIZE_DEFAULT = 25;

export function parsePagination(sp: Record<string, string | undefined>, defaultSize = PAGE_SIZE_DEFAULT) {
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const size = Math.min(200, Math.max(10, parseInt(sp.size ?? String(defaultSize)) || defaultSize));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

export function Pagination({
  page,
  size,
  total,
  basePath,
  preserveParams = {},
}: {
  page: number;
  size: number;
  total: number;
  basePath: string;
  preserveParams?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);

  function buildUrl(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserveParams)) {
      if (v) params.set(k, v);
    }
    params.set("page", String(p));
    if (size !== PAGE_SIZE_DEFAULT) params.set("size", String(size));
    return `${basePath}?${params.toString()}`;
  }

  const prev = page > 1 ? buildUrl(page - 1) : null;
  const next = page < pages ? buildUrl(page + 1) : null;

  // Mostra max 5 numeri di pagina centrati sull'attuale
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, Math.max(page + 2, 5));
  const visiblePages: number[] = [];
  for (let i = start; i <= end; i++) visiblePages.push(i);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground border-t bg-muted/20 px-3 py-2">
      <div>
        {total === 0 ? (
          "Nessun risultato"
        ) : (
          <>
            <span className="font-medium text-foreground">{from}–{to}</span> di{" "}
            <span className="font-medium text-foreground">{total}</span>
          </>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <PageLink href={prev} label="‹ Prec" />
          {start > 1 && (
            <>
              <PageLink href={buildUrl(1)} label="1" active={page === 1} />
              {start > 2 && <span className="px-2 text-muted-foreground">…</span>}
            </>
          )}
          {visiblePages.map((p) => (
            <PageLink key={p} href={buildUrl(p)} label={String(p)} active={p === page} />
          ))}
          {end < pages && (
            <>
              {end < pages - 1 && <span className="px-2 text-muted-foreground">…</span>}
              <PageLink href={buildUrl(pages)} label={String(pages)} active={page === pages} />
            </>
          )}
          <PageLink href={next} label="Succ ›" />
        </div>
      )}
    </div>
  );
}

function PageLink({ href, label, active }: { href: string | null; label: string; active?: boolean }) {
  if (!href)
    return (
      <span className="rounded border px-2.5 py-1 text-xs opacity-40 cursor-not-allowed">{label}</span>
    );
  return (
    <Link
      href={href}
      prefetch={false}
      className={`rounded border px-2.5 py-1 text-xs hover:bg-accent ${
        active ? "bg-foreground text-background border-foreground" : ""
      }`}
    >
      {label}
    </Link>
  );
}
