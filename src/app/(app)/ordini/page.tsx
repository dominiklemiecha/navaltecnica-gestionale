import Link from "next/link";
import { db } from "@db/client";
import { ordini, ddt as ddtTbl, articoli } from "@db/schema/ordini";
import { pratiche } from "@db/schema/pratiche";
import { clienti, fornitori } from "@db/schema/anagrafiche";
import { eq, desc, sql, count } from "drizzle-orm";
import { formatDate, formatEur } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pagination, parsePagination } from "@/components/pagination";

export default async function OrdiniPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const { page, size, offset } = parsePagination(sp);

  const [{ total }] = await db.select({ total: count() }).from(ordini);

  const ordiniRows = await db
    .select({
      o: ordini,
      forn: fornitori.ragioneSociale,
      cliente: clienti.ragioneSociale,
      praticaCodice: pratiche.codice,
      praticaAnno: pratiche.annoRiferimento,
    })
    .from(ordini)
    .leftJoin(fornitori, eq(fornitori.id, ordini.fornitoreId))
    .leftJoin(pratiche, eq(pratiche.id, ordini.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .orderBy(desc(ordini.createdAt))
    .limit(size)
    .offset(offset);

  const ddtRows = await db
    .select({ d: ddtTbl, prCod: pratiche.codice, prAnno: pratiche.annoRiferimento })
    .from(ddtTbl)
    .leftJoin(pratiche, eq(pratiche.id, ddtTbl.praticaId))
    .orderBy(desc(ddtTbl.dataEmissione))
    .limit(25);

  const [art] = await db.select({ c: sql<number>`count(*)::int` }).from(articoli);
  const [forn] = await db.select({ c: sql<number>`count(*)::int` }).from(fornitori);
  const [{ ddtTotal }] = await db.select({ ddtTotal: count() }).from(ddtTbl);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ordini & Magazzino</h1>

      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Articoli</div>
          <div className="text-2xl font-semibold">{art?.c ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Fornitori</div>
          <div className="text-2xl font-semibold">{forn?.c ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Ordini totali</div>
          <div className="text-2xl font-semibold">{Number(total)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">DDT totali</div>
          <div className="text-2xl font-semibold">{ddtTotal}</div>
        </div>
      </div>

      <section className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Ordini</h2>
          <Button asChild variant="secondary"><Link href="/ordini/new">+ Nuovo ordine</Link></Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Numero</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Pratica</th>
              <th className="px-3 py-2">Controparte</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">Importo</th>
              <th className="px-3 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {ordiniRows.map((r) => (
              <tr key={r.o.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono">{r.o.numero}</td>
                <td className="px-3 py-2">
                  <span className="text-xs rounded bg-secondary px-2 py-0.5">
                    {r.o.tipo === "cliente_in" ? "PO cliente" : "Fornitore"}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.praticaCodice}/{String(r.praticaAnno ?? 0).slice(-2)}
                </td>
                <td className="px-3 py-2">{r.forn ?? r.cliente ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(r.o.dataOrdine)}</td>
                <td className="px-3 py-2 text-right">{formatEur(r.o.importo)}</td>
                <td className="px-3 py-2">{r.o.stato}</td>
              </tr>
            ))}
            {ordiniRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun ordine.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} size={size} total={Number(total)} basePath="/ordini" />
      </section>

      <section className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">DDT</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Numero</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Pratica</th>
              <th className="px-3 py-2">Destinatario</th>
              <th className="px-3 py-2">Causale</th>
            </tr>
          </thead>
          <tbody>
            {ddtRows.map((r) => (
              <tr key={r.d.id} className="border-t">
                <td className="px-3 py-2 font-mono">{r.d.numero}</td>
                <td className="px-3 py-2">{formatDate(r.d.dataEmissione)}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.prCod}/{String(r.prAnno ?? 0).slice(-2)}
                </td>
                <td className="px-3 py-2">{r.d.destinatario ?? "—"}</td>
                <td className="px-3 py-2">{r.d.causaleTrasporto ?? "—"}</td>
              </tr>
            ))}
            {ddtRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun DDT.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
