import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { preventivi } from "@db/schema/preventivi";
import { fatture, pagamenti } from "@db/schema/fatturazione";
import { and, desc, eq, inArray, isNotNull, sql, sum } from "drizzle-orm";
import { transizionePratica } from "@/modules/pratiche/service";

export async function nextNumeroProforma(anno: number): Promise<string> {
  const [r] = await db
    .select({ n: sql<number>`count(*)` })
    .from(fatture)
    .where(and(eq(fatture.tipo, "proforma"), eq(fatture.annoFiscale, String(anno))));
  return `PF-${anno}-${String(Number(r?.n ?? 0) + 1).padStart(4, "0")}`;
}

/**
 * Step 5 (Bordo): genera la proforma a partire dal preventivo accettato della pratica.
 * Se la pratica è "accettata" la fa avanzare a "in_attesa_pagamento".
 */
export async function generaProformaDaPreventivo(praticaId: string): Promise<
  { ok: true; fatturaId: string } | { ok: false; motivo: string }
> {
  const [prev] = await db
    .select()
    .from(preventivi)
    .where(and(eq(preventivi.praticaId, praticaId), isNotNull(preventivi.dataAccettazione)))
    .orderBy(desc(preventivi.dataAccettazione))
    .limit(1);
  if (!prev) return { ok: false, motivo: "Nessun preventivo accettato per questa pratica." };

  const esistenti = await db
    .select({ id: fatture.id })
    .from(fatture)
    .where(and(eq(fatture.praticaId, praticaId), eq(fatture.tipo, "proforma")));
  if (esistenti.length > 0) return { ok: false, motivo: "Proforma già emessa per questa pratica." };

  const netto = Number(prev.totaleNetto ?? 0);
  const ivaPerc = Number(prev.iva ?? 22);
  const ivaAmount = netto * (ivaPerc / 100);
  const totale = netto + ivaAmount;
  const anno = new Date().getFullYear();
  const numero = await nextNumeroProforma(anno);

  const [f] = await db
    .insert(fatture)
    .values({
      praticaId,
      tipo: "proforma",
      numero,
      annoFiscale: String(anno),
      dataEmissione: new Date().toISOString().slice(0, 10),
      importoNetto: netto.toFixed(2),
      iva: ivaAmount.toFixed(2),
      totale: totale.toFixed(2),
      stato: "emessa",
      note: `Proforma anticipo da offerta ${prev.codiceOfferta}`,
    })
    .returning({ id: fatture.id });

  const [p] = await db.select().from(pratiche).where(eq(pratiche.id, praticaId)).limit(1);
  if (p?.stato === "accettata") {
    await transizionePratica({
      praticaId,
      evento: "proforma_emessa",
      statoTarget: "in_attesa_pagamento",
    });
  }
  return { ok: true, fatturaId: f.id };
}

export type StatoIncasso = {
  totaleProforme: number;
  pagato: number;
  saldato: boolean;
  hasProforma: boolean;
};

export async function statoIncassoPratica(praticaId: string): Promise<StatoIncasso> {
  const proforme = await db
    .select({ id: fatture.id, totale: fatture.totale })
    .from(fatture)
    .where(and(eq(fatture.praticaId, praticaId), eq(fatture.tipo, "proforma")));
  if (proforme.length === 0)
    return { totaleProforme: 0, pagato: 0, saldato: false, hasProforma: false };

  const totaleProforme = proforme.reduce((s, f) => s + Number(f.totale ?? 0), 0);
  const ids = proforme.map((f) => f.id);
  const [agg] = await db
    .select({ tot: sum(pagamenti.importo) })
    .from(pagamenti)
    .where(inArray(pagamenti.fatturaId, ids));
  const pagato = Number(agg?.tot ?? 0);
  return {
    totaleProforme,
    pagato,
    saldato: pagato + 0.01 >= totaleProforme,
    hasProforma: true,
  };
}

/**
 * Step 6: registra un incasso su una fattura. Se la proforma risulta saldata e la
 * pratica è in attesa di pagamento, la fa avanzare automaticamente a "materiale_in_arrivo".
 */
export async function registraPagamento(args: {
  fatturaId: string;
  praticaId: string;
  importo: number;
  modalita?: string;
  riferimento?: string;
}) {
  const { fatturaId, praticaId, importo, modalita, riferimento } = args;
  await db.insert(pagamenti).values({
    fatturaId,
    data: new Date().toISOString().slice(0, 10),
    importo: importo.toFixed(2),
    modalita: modalita ?? null,
    riferimento: riferimento ?? null,
  });

  // aggiorna stato fattura
  const [f] = await db.select().from(fatture).where(eq(fatture.id, fatturaId)).limit(1);
  if (f) {
    const [agg] = await db
      .select({ tot: sum(pagamenti.importo) })
      .from(pagamenti)
      .where(eq(pagamenti.fatturaId, fatturaId));
    const incassato = Number(agg?.tot ?? 0);
    const totale = Number(f.totale ?? 0);
    const nuovoStato = incassato + 0.01 >= totale ? "pagata" : "pagata_parziale";
    await db.update(fatture).set({ stato: nuovoStato }).where(eq(fatture.id, fatturaId));
  }

  // auto-avanzamento pratica Bordo
  const incasso = await statoIncassoPratica(praticaId);
  const [p] = await db.select().from(pratiche).where(eq(pratiche.id, praticaId)).limit(1);
  if (incasso.saldato && p?.stato === "in_attesa_pagamento") {
    await transizionePratica({
      praticaId,
      evento: "incasso_completo",
      statoTarget: "materiale_in_arrivo",
    });
  }
}
