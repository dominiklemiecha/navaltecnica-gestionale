import Link from "next/link";
import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni, sedi } from "@db/schema/anagrafiche";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Pagination, parsePagination } from "@/components/pagination";

const STATI = [
  { value: "richiesta", label: "Richiesta", color: "bg-slate-100" },
  { value: "offerta", label: "Offerta", color: "bg-blue-100" },
  { value: "in_attesa_accettazione", label: "Att. accettazione", color: "bg-amber-100" },
  { value: "accettata", label: "Accettata", color: "bg-green-100" },
  { value: "in_attesa_pagamento", label: "Att. pagamento", color: "bg-amber-100" },
  { value: "materiale_in_arrivo", label: "Materiale in arrivo", color: "bg-cyan-100" },
  { value: "pianificata", label: "Pianificata", color: "bg-indigo-100" },
  { value: "in_esecuzione", label: "In esecuzione", color: "bg-purple-100" },
  { value: "chiusura_tecnica", label: "Chiusura tecnica", color: "bg-violet-100" },
  { value: "da_fatturare", label: "Da fatturare", color: "bg-orange-100" },
  { value: "chiusa", label: "Chiusa", color: "bg-emerald-100" },
  { value: "annullata", label: "Annullata", color: "bg-rose-100" },
];

export default async function PratichePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stato?: string; cliente?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const stato = sp.stato;
  const tipoCli = sp.cliente;
  const { page, size, offset } = parsePagination(sp);
  const like = q ? `%${q}%` : null;

  const conditions: any[] = [];
  if (like) {
    conditions.push(
      or(
        ilike(pratiche.codice, like),
        ilike(clienti.ragioneSociale, like),
        ilike(imbarcazioni.nome, like),
        ilike(imbarcazioni.hullNumber, like)
      )
    );
  }
  if (stato) conditions.push(eq(pratiche.stato, stato as any));
  if (tipoCli === "cantiere" || tipoCli === "bordo")
    conditions.push(eq(clienti.tipo, tipoCli as any));

  // Conteggi per stato (tutti, indipendenti dal filtro stato)
  const conditionsForCount = conditions.filter((c) => {
    const s = c?.toString?.() ?? "";
    return !s.includes("stato"); // escludi solo il filtro stato
  });
  const counters = await db
    .select({ stato: pratiche.stato, n: count() })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(conditionsForCount.length ? (sql.join(conditionsForCount, sql` AND `) as any) : undefined)
    .groupBy(pratiche.stato);
  const cmap: Record<string, number> = {};
  for (const r of counters) cmap[r.stato as string] = Number(r.n);
  const totale = Object.values(cmap).reduce((a, b) => a + b, 0);

  const where = conditions.length ? (sql.join(conditions, sql` AND `) as any) : undefined;

  // Conteggio totale (per paginazione)
  const [{ total }] = await db
    .select({ total: count() })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(where);

  const rows = await db
    .select({
      id: pratiche.id,
      codice: pratiche.codice,
      anno: pratiche.annoRiferimento,
      stato: pratiche.stato,
      tipo: pratiche.tipoLavoro,
      cliente: clienti.ragioneSociale,
      tipoCliente: clienti.tipo,
      imb: imbarcazioni.nome,
      hull: imbarcazioni.hullNumber,
      sede: sedi.nome,
      apertura: pratiche.dataApertura,
    })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .leftJoin(sedi, eq(sedi.id, pratiche.sedeInterventoId))
    .where(where)
    .orderBy(desc(pratiche.dataApertura))
    .limit(size)
    .offset(offset);

  function chipHref(s?: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("stato", s);
    if (tipoCli) p.set("cliente", tipoCli);
    return `/pratiche${p.toString() ? `?${p.toString()}` : ""}`;
  }

  function clienteHref(c?: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (stato) p.set("stato", stato);
    if (c) p.set("cliente", c);
    return `/pratiche${p.toString() ? `?${p.toString()}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Pratiche</h1>
        <Button asChild>
          <Link href="/pratiche/new">+ Nuova pratica</Link>
        </Button>
      </div>

      {/* Chip stato */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={chipHref()}
          className={`rounded-full border px-3 py-1 text-xs ${!stato ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-accent"}`}
        >
          Tutte <span className="opacity-70">({totale})</span>
        </Link>
        {STATI.map((s) => {
          const n = cmap[s.value] ?? 0;
          if (n === 0 && stato !== s.value) return null;
          const active = stato === s.value;
          return (
            <Link
              key={s.value}
              href={chipHref(s.value)}
              className={`rounded-full border px-3 py-1 text-xs ${active ? "bg-foreground text-background border-foreground" : `${s.color} hover:opacity-80`}`}
            >
              {s.label} <span className="opacity-70">({n})</span>
            </Link>
          );
        })}
      </div>

      {/* Chip tipo cliente */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={clienteHref()}
          className={`rounded border px-2.5 py-0.5 text-[11px] ${!tipoCli ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-accent"}`}
        >
          Tutti i clienti
        </Link>
        <Link
          href={clienteHref("cantiere")}
          className={`rounded border px-2.5 py-0.5 text-[11px] ${tipoCli === "cantiere" ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-accent"}`}
        >
          🏭 Solo cantieri
        </Link>
        <Link
          href={clienteHref("bordo")}
          className={`rounded border px-2.5 py-0.5 text-[11px] ${tipoCli === "bordo" ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-accent"}`}
        >
          ⛵ Solo bordo
        </Link>
      </div>

      <form className="flex gap-2">
        <input type="hidden" name="stato" value={stato ?? ""} />
        <input type="hidden" name="cliente" value={tipoCli ?? ""} />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Codice, cliente, nome barca, hull..."
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          Cerca
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Codice</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Imbarcazione</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Sede</th>
              <th className="px-3 py-2">Stato</th>
              <th className="px-3 py-2">Apertura</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const stato = STATI.find((s) => s.value === p.stato);
              return (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/pratiche/${p.id}`} className="text-primary hover:underline">
                      {p.codice}/{String(p.anno).slice(-2)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {p.cliente ?? "—"}
                    {p.tipoCliente && (
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {p.tipoCliente === "cantiere" ? "🏭" : "⛵"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {p.imb ?? "—"}{" "}
                    {p.hull && <span className="text-muted-foreground text-xs">({p.hull})</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{p.tipo ?? "—"}</td>
                  <td className="px-3 py-2">{p.sede ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${stato?.color ?? "bg-muted"}`}>
                      {stato?.label ?? p.stato}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(p.apertura)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Nessuna pratica.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          size={size}
          total={Number(total)}
          basePath="/pratiche"
          preserveParams={{ q, stato, cliente: tipoCli }}
        />
      </div>
    </div>
  );
}
