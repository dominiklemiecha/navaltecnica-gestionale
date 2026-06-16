import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { pratiche, transizioniPratica } from "@db/schema/pratiche";
import { preventivi } from "@db/schema/preventivi";
import { ordini, ddt } from "@db/schema/ordini";
import { fatture, pagamenti } from "@db/schema/fatturazione";
import { reportInterventi } from "@db/schema/field-report";
import { documenti } from "@db/schema/documenti";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { eq, inArray } from "drizzle-orm";
import { formatEur } from "@/lib/utils";

type Evento = {
  ts: Date;
  categoria: string;
  colore: string;
  titolo: string;
  dettaglio?: string;
  href?: string;
};

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  return new Date(0);
}

export default async function StoricoPratica({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db
    .select({ p: pratiche, cli: clienti, imb: imbarcazioni })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(eq(pratiche.id, id))
    .limit(1);
  if (!row) notFound();

  const [transizioni, prev, ord, ddtList, fattList, reps, docs] = await Promise.all([
    db.select().from(transizioniPratica).where(eq(transizioniPratica.praticaId, id)),
    db.select().from(preventivi).where(eq(preventivi.praticaId, id)),
    db.select().from(ordini).where(eq(ordini.praticaId, id)),
    db.select().from(ddt).where(eq(ddt.praticaId, id)),
    db.select().from(fatture).where(eq(fatture.praticaId, id)),
    db.select().from(reportInterventi).where(eq(reportInterventi.praticaId, id)),
    db.select().from(documenti).where(eq(documenti.praticaId, id)),
  ]);

  const fattIds = fattList.map((f) => f.id);
  const pagList =
    fattIds.length > 0
      ? await db.select().from(pagamenti).where(inArray(pagamenti.fatturaId, fattIds))
      : [];

  const eventi: Evento[] = [];

  for (const t of transizioni) {
    eventi.push({
      ts: toDate(t.createdAt),
      categoria: "Stato",
      colore: "bg-slate-100 text-slate-700",
      titolo: `${t.statoDa ?? "(inizio)"} → ${t.statoA}`,
      dettaglio: t.evento,
    });
  }
  for (const p of prev) {
    eventi.push({
      ts: toDate(p.createdAt),
      categoria: "Preventivo",
      colore: "bg-blue-100 text-blue-700",
      titolo: `Offerta ${p.codiceOfferta}${p.versione > 1 ? ` rev ${p.versione}` : ""}`,
      dettaglio: p.totaleNetto ? `Netto ${formatEur(p.totaleNetto)}` : undefined,
      href: `/preventivi/${p.id}`,
    });
    if (p.dataInvio)
      eventi.push({
        ts: toDate(p.dataInvio),
        categoria: "Preventivo",
        colore: "bg-blue-100 text-blue-700",
        titolo: `Offerta ${p.codiceOfferta} inviata`,
        href: `/preventivi/${p.id}`,
      });
    if (p.dataAccettazione)
      eventi.push({
        ts: toDate(p.dataAccettazione),
        categoria: "Preventivo",
        colore: "bg-green-100 text-green-700",
        titolo: `Offerta ${p.codiceOfferta} accettata (${p.modalitaAccettazione ?? "—"})`,
        dettaglio: p.riferimentoPo ? `PO ${p.riferimentoPo}` : undefined,
        href: `/preventivi/${p.id}`,
      });
  }
  for (const o of ord) {
    eventi.push({
      ts: toDate(o.dataOrdine ?? o.createdAt),
      categoria: "Ordine",
      colore: "bg-cyan-100 text-cyan-700",
      titolo: `Ordine ${o.numero} (${o.tipo === "fornitore_out" ? "fornitore" : "PO cliente"})`,
      dettaglio: o.importo ? formatEur(o.importo) : undefined,
    });
  }
  for (const d of ddtList) {
    eventi.push({
      ts: toDate(d.dataEmissione),
      categoria: "DDT",
      colore: "bg-teal-100 text-teal-700",
      titolo: `DDT ${d.numero}`,
      dettaglio: d.causaleTrasporto ?? undefined,
    });
  }
  for (const r of reps) {
    eventi.push({
      ts: toDate(r.dataIntervento),
      categoria: "Report",
      colore: "bg-purple-100 text-purple-700",
      titolo: `Report intervento (${r.stato})`,
      dettaglio: r.oreLavorate ? `${r.oreLavorate} ore` : undefined,
      href: `/pratiche/${id}/report`,
    });
  }
  for (const f of fattList) {
    eventi.push({
      ts: toDate(f.dataEmissione),
      categoria: "Fattura",
      colore: "bg-orange-100 text-orange-700",
      titolo: `Fattura ${f.numero}/${f.annoFiscale} (${f.tipo})`,
      dettaglio: `${formatEur(f.totale)} · ${f.stato}`,
    });
  }
  for (const pg of pagList) {
    eventi.push({
      ts: toDate(pg.data),
      categoria: "Incasso",
      colore: "bg-emerald-100 text-emerald-700",
      titolo: `Incasso ${formatEur(pg.importo)}`,
      dettaglio: pg.modalita ?? undefined,
    });
  }
  for (const dc of docs) {
    eventi.push({
      ts: toDate(dc.uploadedAt),
      categoria: "Documento",
      colore: "bg-gray-100 text-gray-700",
      titolo: `${dc.tipo}: ${dc.fileName}`,
      href: `/api/files/${dc.filePath}`,
    });
  }

  eventi.sort((a, b) => b.ts.getTime() - a.ts.getTime());

  const fmt = (d: Date) =>
    d.getTime() === 0
      ? "—"
      : d.toLocaleString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/pratiche/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Pratica {row.p.codice}/{String(row.p.annoRiferimento).slice(-2)}
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Storico interventi</h1>
        <div className="text-sm text-muted-foreground">
          {row.cli?.ragioneSociale} {row.imb?.nome && `· ${row.imb.nome}`}{" "}
          {row.imb?.hullNumber && `(${row.imb.hullNumber})`}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <div className="text-xs text-muted-foreground mb-4">
          {eventi.length} eventi · cronologia completa della pratica (step 10: archiviazione)
        </div>
        <ol className="relative border-l-2 border-muted ml-3 space-y-5">
          {eventi.map((e, i) => (
            <li key={i} className="ml-6">
              <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${e.colore}`}>
                  {e.categoria}
                </span>
                <span className="text-xs text-muted-foreground">{fmt(e.ts)}</span>
              </div>
              <div className="mt-1 text-sm font-medium">
                {e.href ? (
                  <Link href={e.href} className="text-primary hover:underline" target={e.href.startsWith("/api/") ? "_blank" : undefined}>
                    {e.titolo}
                  </Link>
                ) : (
                  e.titolo
                )}
              </div>
              {e.dettaglio && <div className="text-xs text-muted-foreground">{e.dettaglio}</div>}
            </li>
          ))}
          {eventi.length === 0 && (
            <li className="ml-6 text-muted-foreground text-sm">Nessun evento registrato.</li>
          )}
        </ol>
      </section>
    </div>
  );
}
