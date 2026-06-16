import { notFound } from "next/navigation";
import { db } from "@db/client";
import { preventivi, preventiviRighe } from "@db/schema/preventivi";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { eq, asc } from "drizzle-orm";
import { formatDate, formatEur } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Stampa preventivo" };

export default async function StampaPreventivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ p: preventivi, pr: pratiche, cli: clienti, imb: imbarcazioni })
    .from(preventivi)
    .leftJoin(pratiche, eq(pratiche.id, preventivi.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(eq(preventivi.id, id))
    .limit(1);
  if (!row) notFound();

  const righe = await db
    .select()
    .from(preventiviRighe)
    .where(eq(preventiviRighe.preventivoId, id))
    .orderBy(asc(preventiviRighe.ordine), asc(preventiviRighe.tipo));

  const gruppi: Record<string, typeof righe> = {};
  for (const r of righe) {
    if (!gruppi[r.tipo]) gruppi[r.tipo] = [];
    gruppi[r.tipo].push(r);
  }
  const gruppiOrdine = ["ricambio", "manodopera", "trasferta", "officina", "altro"];

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .stampa-doc { box-shadow: none !important; border: 0 !important; }
        }
        .stampa-doc { max-width: 800px; margin: 0 auto; }
      `}</style>
      <div className="no-print flex justify-end gap-2 mb-4">
        <a
          href={`/preventivi/${id}`}
          className="text-sm rounded border px-3 py-1.5 hover:bg-accent"
        >
          ← Torna al preventivo
        </a>
        <PrintButton />
      </div>
      <div className="stampa-doc bg-white text-black p-8 rounded-lg border shadow-sm">
        {/* Intestazione */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b">
          <div>
            <div className="text-2xl font-bold">Navaltecnica</div>
            <div className="text-xs text-gray-600">Service & Installazioni impianti trattamento acque</div>
            <div className="text-xs text-gray-600 mt-1">P.IVA — · Tel. — · info@navaltecnica.it</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-600 uppercase tracking-wide">Preventivo</div>
            <div className="text-3xl font-bold font-mono">{row.p.codiceOfferta}</div>
            {row.p.versione > 1 && (
              <div className="text-xs text-gray-600">Rev. {row.p.versione}</div>
            )}
            <div className="text-xs text-gray-600 mt-2">
              Data: {formatDate(row.p.createdAt)}
            </div>
            {row.p.validitaGiorni && (
              <div className="text-xs text-gray-600">Validità: {row.p.validitaGiorni} giorni</div>
            )}
          </div>
        </div>

        {/* Cliente + barca */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="rounded border bg-gray-50 p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Cliente</div>
            <div className="font-semibold mt-0.5">{row.cli?.ragioneSociale}</div>
            {row.cli?.partitaIva && (
              <div className="text-xs text-gray-600">P.IVA {row.cli.partitaIva}</div>
            )}
            {row.cli?.indirizzo && (
              <div className="text-xs text-gray-600">
                {row.cli.indirizzo} {row.cli.cap} {row.cli.citta}
              </div>
            )}
          </div>
          <div className="rounded border bg-gray-50 p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Imbarcazione</div>
            <div className="font-semibold mt-0.5">{row.imb?.nome ?? "—"}</div>
            <div className="text-xs text-gray-600">
              {row.imb?.hullNumber && `Hull ${row.imb.hullNumber}`}
              {row.imb?.modello && ` · Mod. ${row.imb.modello}`}
              {row.imb?.metri && ` · ${row.imb.metri} m`}
            </div>
          </div>
        </div>

        {/* Riferimento pratica */}
        <div className="text-xs text-gray-600 mb-4">
          <strong>Rif. pratica:</strong> {row.pr?.codice}/{String(row.pr?.annoRiferimento ?? 0).slice(-2)}
          {row.pr?.tipoLavoro && ` · ${row.pr.tipoLavoro}`}
        </div>

        {/* Tabelle per gruppo */}
        {gruppiOrdine.map((tipo) => {
          const r = gruppi[tipo];
          if (!r || r.length === 0) return null;
          const subtot = r.reduce((s, x) => s + parseFloat(x.importo ?? "0"), 0);
          return (
            <div key={tipo} className="mb-4">
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-1">
                {labelTipo(tipo)}
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600">
                    <th className="text-left py-1 px-2">Descrizione</th>
                    <th className="text-right py-1 px-2 w-16">Qta</th>
                    <th className="text-right py-1 px-2 w-24">€ unit.</th>
                    <th className="text-right py-1 px-2 w-16">Sc. %</th>
                    <th className="text-right py-1 px-2 w-24">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {r.map((x) => (
                    <tr key={x.id} className="border-b border-gray-100">
                      <td className="py-1.5 px-2">
                        {x.descrizione}
                        {x.codiceArticolo && (
                          <span className="text-gray-500 ml-2 font-mono text-[10px]">
                            ({x.codiceArticolo})
                          </span>
                        )}
                      </td>
                      <td className="text-right py-1.5 px-2">{x.quantita}</td>
                      <td className="text-right py-1.5 px-2">{formatEur(x.prezzoUnitario)}</td>
                      <td className="text-right py-1.5 px-2">{x.sconto ?? 0}</td>
                      <td className="text-right py-1.5 px-2 font-medium">{formatEur(x.importo)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="text-right py-1.5 px-2 font-medium text-xs">
                      Subtotale {labelTipo(tipo)}
                    </td>
                    <td className="text-right py-1.5 px-2 font-medium border-t border-gray-300">
                      {formatEur(subtot)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Totali */}
        <div className="mt-6 ml-auto w-72 border rounded text-sm">
          <div className="flex justify-between px-3 py-1.5 border-b">
            <span className="text-gray-600">Totale netto</span>
            <span className="font-medium">{formatEur(row.p.totaleNetto)}</span>
          </div>
          <div className="flex justify-between px-3 py-1.5 border-b">
            <span className="text-gray-600">IVA {row.p.iva ?? 22}%</span>
            <span className="font-medium">
              {formatEur(
                row.p.totaleLordo && row.p.totaleNetto
                  ? parseFloat(row.p.totaleLordo) - parseFloat(row.p.totaleNetto)
                  : 0
              )}
            </span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-gray-50 font-bold">
            <span>TOTALE</span>
            <span>{formatEur(row.p.totaleLordo)}</span>
          </div>
        </div>

        {/* Note */}
        {row.p.note && (
          <div className="mt-6 text-xs">
            <div className="font-semibold mb-1">Note:</div>
            <p className="whitespace-pre-wrap text-gray-700">{row.p.note}</p>
          </div>
        )}

        {/* Firma */}
        <div className="mt-12 grid grid-cols-2 gap-12 text-xs">
          <div>
            <div className="border-t border-gray-400 pt-1 text-gray-600">Per accettazione (firma cliente)</div>
            <div className="text-gray-500 mt-1">Data: ____________________</div>
          </div>
          <div className="text-right">
            <div className="text-gray-700 mb-6">Navaltecnica</div>
          </div>
        </div>
      </div>
    </>
  );
}

function labelTipo(t: string) {
  return {
    ricambio: "Ricambi & Materiali",
    manodopera: "Manodopera",
    trasferta: "Trasferta",
    officina: "Lavorazioni in officina",
    altro: "Altro",
  }[t] ?? t;
}

