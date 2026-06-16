import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { listiniCantiere, listiniRighe, listiniScafoPersonalizzati } from "@db/schema/listini";
import { clienti } from "@db/schema/anagrafiche";
import { eq, asc, and } from "drizzle-orm";
import { formatDate, formatEur } from "@/lib/utils";

export default async function ListinoDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hull?: string; modello?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [l] = await db
    .select({ l: listiniCantiere, c: clienti })
    .from(listiniCantiere)
    .leftJoin(clienti, eq(clienti.id, listiniCantiere.cantiereId))
    .where(eq(listiniCantiere.id, id))
    .limit(1);
  if (!l) notFound();

  const righe = await db
    .select()
    .from(listiniRighe)
    .where(eq(listiniRighe.listinoId, id))
    .orderBy(asc(listiniRighe.descrizioneArticolo))
    .limit(150);

  const scafi = await db
    .selectDistinct({ hull: listiniScafoPersonalizzati.hullNumber, modello: listiniScafoPersonalizzati.modelloScafo })
    .from(listiniScafoPersonalizzati)
    .where(eq(listiniScafoPersonalizzati.listinoId, id))
    .orderBy(asc(listiniScafoPersonalizzati.modelloScafo), asc(listiniScafoPersonalizzati.hullNumber));

  const dettaglioScafo = sp.hull
    ? await db
        .select()
        .from(listiniScafoPersonalizzati)
        .where(
          and(
            eq(listiniScafoPersonalizzati.listinoId, id),
            eq(listiniScafoPersonalizzati.hullNumber, sp.hull)
          )
        )
        .orderBy(asc(listiniScafoPersonalizzati.descrizioneArticolo))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/listini" className="text-sm text-muted-foreground hover:underline">
          ← Listini
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{l.l.nome}</h1>
        <div className="text-sm text-muted-foreground">
          {l.c?.ragioneSociale} · valido dal {formatDate(l.l.validoDa)}
          {l.l.validoA && ` al ${formatDate(l.l.validoA)}`}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Articoli listino ({righe.length})</h2>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left sticky top-0">
              <tr>
                <th className="px-3 py-2">Articolo</th>
                <th className="px-3 py-2">Codice</th>
                <th className="px-3 py-2 text-right">Prezzo vendita</th>
                <th className="px-3 py-2 text-right">Prezzo acquisto</th>
                <th className="px-3 py-2 text-right">Margine</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => {
                const v = r.prezzoVendita ? parseFloat(r.prezzoVendita) : null;
                const a = r.prezzoAcquisto ? parseFloat(r.prezzoAcquisto) : null;
                const margine = v && a ? ((v - a) / v) * 100 : null;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.descrizioneArticolo}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {r.codiceArticolo ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{formatEur(r.prezzoVendita)}</td>
                    <td className="px-3 py-2 text-right">{formatEur(r.prezzoAcquisto)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {margine !== null ? `${margine.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {scafi.length > 0 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-3">Scafi personalizzati ({scafi.length})</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {scafi.map((s) => (
              <Link
                key={`${s.modello}-${s.hull}`}
                href={`/listini/${id}?hull=${encodeURIComponent(s.hull)}`}
                className={`rounded border px-3 py-1 text-xs hover:bg-accent ${
                  sp.hull === s.hull ? "bg-primary text-primary-foreground border-primary" : ""
                }`}
              >
                {s.modello} · {s.hull}
              </Link>
            ))}
          </div>

          {dettaglioScafo.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Scafo {sp.hull}</h3>
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-3 py-2">Articolo</th>
                    <th className="px-3 py-2 text-right">Vendita</th>
                    <th className="px-3 py-2 text-right">Acquisto</th>
                    <th className="px-3 py-2">Ordine</th>
                    <th className="px-3 py-2">Consegna</th>
                  </tr>
                </thead>
                <tbody>
                  {dettaglioScafo.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2">{d.descrizioneArticolo}</td>
                      <td className="px-3 py-2 text-right">{formatEur(d.prezzoVendita)}</td>
                      <td className="px-3 py-2 text-right">{formatEur(d.prezzoAcquisto)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(d.dataOrdine)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(d.dataConsegna)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
