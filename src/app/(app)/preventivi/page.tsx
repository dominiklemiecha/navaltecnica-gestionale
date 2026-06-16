import Link from "next/link";
import { db } from "@db/client";
import { preventivi } from "@db/schema/preventivi";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { eq, desc, count } from "drizzle-orm";
import { formatDate, formatEur } from "@/lib/utils";
import { Pagination, parsePagination } from "@/components/pagination";

export default async function PreventiviPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const { page, size, offset } = parsePagination(sp);

  const [{ total }] = await db.select({ total: count() }).from(preventivi);

  const rows = await db
    .select({
      id: preventivi.id,
      codice: preventivi.codiceOfferta,
      versione: preventivi.versione,
      totaleNetto: preventivi.totaleNetto,
      dataInvio: preventivi.dataInvio,
      dataAcc: preventivi.dataAccettazione,
      modalita: preventivi.modalitaAccettazione,
      praticaId: pratiche.id,
      praticaCodice: pratiche.codice,
      praticaAnno: pratiche.annoRiferimento,
      cliente: clienti.ragioneSociale,
      imb: imbarcazioni.nome,
    })
    .from(preventivi)
    .leftJoin(pratiche, eq(pratiche.id, preventivi.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .orderBy(desc(preventivi.createdAt))
    .limit(size)
    .offset(offset);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Preventivi</h1>
      <p className="text-sm text-muted-foreground">
        Crea un preventivo da una pratica esistente: vai alla pratica → &ldquo;Nuovo preventivo&rdquo;.
      </p>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Offerta</th>
              <th className="px-3 py-2">Pratica</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Imbarcazione</th>
              <th className="px-3 py-2 text-right">Totale</th>
              <th className="px-3 py-2">Stato</th>
              <th className="px-3 py-2">Inviato</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono">
                  <Link className="text-primary hover:underline" href={`/preventivi/${p.id}`}>
                    {p.codice}
                    {p.versione > 1 ? ` rev ${p.versione}` : ""}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {p.praticaCodice}/{String(p.praticaAnno).slice(-2)}
                </td>
                <td className="px-3 py-2">{p.cliente ?? "—"}</td>
                <td className="px-3 py-2">{p.imb ?? "—"}</td>
                <td className="px-3 py-2 text-right">{formatEur(p.totaleNetto)}</td>
                <td className="px-3 py-2">
                  {p.dataAcc ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs">
                      Accettato ({p.modalita})
                    </span>
                  ) : p.dataInvio ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs">Inviato</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">Bozza</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(p.dataInvio)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun preventivo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} size={size} total={Number(total)} basePath="/preventivi" />
      </div>
    </div>
  );
}
