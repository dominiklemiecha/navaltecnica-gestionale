import Link from "next/link";
import { db } from "@db/client";
import { fatture, certificati } from "@db/schema/fatturazione";
import { pratiche } from "@db/schema/pratiche";
import { clienti } from "@db/schema/anagrafiche";
import { eq, desc, count } from "drizzle-orm";
import { formatDate, formatEur } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pagination, parsePagination } from "@/components/pagination";

export default async function FatturePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const { page, size, offset } = parsePagination(sp);

  const [{ total }] = await db.select({ total: count() }).from(fatture);

  const rows = await db
    .select({
      f: fatture,
      praticaCodice: pratiche.codice,
      praticaAnno: pratiche.annoRiferimento,
      cliente: clienti.ragioneSociale,
    })
    .from(fatture)
    .leftJoin(pratiche, eq(pratiche.id, fatture.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .orderBy(desc(fatture.dataEmissione))
    .limit(size)
    .offset(offset);

  const certs = await db
    .select({
      c: certificati,
      praticaCodice: pratiche.codice,
      praticaAnno: pratiche.annoRiferimento,
    })
    .from(certificati)
    .leftJoin(pratiche, eq(pratiche.id, certificati.praticaId))
    .orderBy(desc(certificati.dataEmissione))
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fatturazione & Certificati</h1>

      <section className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Fatture</h2>
          <Button asChild variant="secondary">
            <Link href="/fatture/new">+ Nuova fattura</Link>
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Numero</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Pratica</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">Netto</th>
              <th className="px-3 py-2 text-right">Totale</th>
              <th className="px-3 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.f.id} className="border-t">
                <td className="px-3 py-2 font-mono">{r.f.numero}/{r.f.annoFiscale}</td>
                <td className="px-3 py-2">
                  <span className="text-xs rounded bg-secondary px-2 py-0.5">{r.f.tipo}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.praticaCodice}/{String(r.praticaAnno ?? 0).slice(-2)}
                </td>
                <td className="px-3 py-2">{r.cliente ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(r.f.dataEmissione)}</td>
                <td className="px-3 py-2 text-right">{formatEur(r.f.importoNetto)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatEur(r.f.totale)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs rounded px-2 py-0.5 ${
                      r.f.stato === "pagata"
                        ? "bg-green-100"
                        : r.f.stato === "insoluta"
                        ? "bg-rose-100"
                        : "bg-amber-100"
                    }`}
                  >
                    {r.f.stato}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  Nessuna fattura.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} size={size} total={Number(total)} basePath="/fatture" />
      </section>

      <section className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Certificati fine lavoro</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Numero</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Pratica</th>
              <th className="px-3 py-2">Data emissione</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((r) => (
              <tr key={r.c.id} className="border-t">
                <td className="px-3 py-2 font-mono">{r.c.numero ?? "—"}</td>
                <td className="px-3 py-2">{r.c.tipo}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.praticaCodice}/{String(r.praticaAnno ?? 0).slice(-2)}
                </td>
                <td className="px-3 py-2">{formatDate(r.c.dataEmissione)}</td>
              </tr>
            ))}
            {certs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun certificato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
