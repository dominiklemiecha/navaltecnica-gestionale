import { db } from "@db/client";
import { pratiche, transizioniPratica } from "@db/schema/pratiche";
import { and, desc, eq, max } from "drizzle-orm";

export type StatoPratica =
  | "richiesta"
  | "offerta"
  | "in_attesa_accettazione"
  | "accettata"
  | "in_attesa_pagamento"
  | "materiale_in_arrivo"
  | "pianificata"
  | "in_esecuzione"
  | "chiusura_tecnica"
  | "da_fatturare"
  | "chiusa"
  | "annullata";

const TRANSIZIONI: Record<StatoPratica, StatoPratica[]> = {
  richiesta: ["offerta", "annullata"],
  // l'accettazione può arrivare subito dopo l'invio dell'offerta, senza passare
  // esplicitamente dallo stato "in attesa accettazione"
  offerta: ["in_attesa_accettazione", "accettata", "annullata"],
  in_attesa_accettazione: ["accettata", "annullata"],
  accettata: ["in_attesa_pagamento", "materiale_in_arrivo", "annullata"],
  in_attesa_pagamento: ["materiale_in_arrivo", "annullata"],
  materiale_in_arrivo: ["pianificata", "annullata"],
  pianificata: ["in_esecuzione", "annullata"],
  in_esecuzione: ["chiusura_tecnica", "annullata"],
  chiusura_tecnica: ["da_fatturare", "annullata"],
  da_fatturare: ["chiusa"],
  chiusa: [],
  annullata: [],
};

export function transizioniDisponibili(stato: StatoPratica): StatoPratica[] {
  return TRANSIZIONI[stato] ?? [];
}

export async function nextCodicePratica(anno: number): Promise<string> {
  const [r] = await db
    .select({ m: max(pratiche.codice) })
    .from(pratiche)
    .where(eq(pratiche.annoRiferimento, anno));
  const ultimoNum = parseInt(r?.m ?? "0", 10) || 0;
  return String(ultimoNum + 1).padStart(3, "0");
}

export async function transizionePratica(args: {
  praticaId: string;
  evento: string;
  statoTarget: StatoPratica;
  utenteId?: string;
  payload?: Record<string, unknown>;
}) {
  const { praticaId, evento, statoTarget, utenteId, payload } = args;
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(pratiche).where(eq(pratiche.id, praticaId)).limit(1);
    if (!p) throw new Error(`Pratica ${praticaId} non trovata`);
    const ammessi = TRANSIZIONI[p.stato as StatoPratica] ?? [];
    if (!ammessi.includes(statoTarget)) {
      throw new Error(`Transizione non ammessa: ${p.stato} → ${statoTarget}`);
    }
    await tx
      .update(pratiche)
      .set({
        stato: statoTarget,
        updatedAt: new Date(),
        dataChiusura: statoTarget === "chiusa" ? new Date() : p.dataChiusura,
      })
      .where(eq(pratiche.id, praticaId));
    await tx.insert(transizioniPratica).values({
      praticaId,
      statoDa: p.stato,
      statoA: statoTarget,
      evento,
      utenteId,
      payload: payload ? JSON.stringify(payload) : null,
    });
  });
}
