import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { clienti } from "@db/schema/anagrafiche";
import { fatture, pagamenti } from "@db/schema/fatturazione";
import { and, eq, inArray, sum } from "drizzle-orm";

export type GateRicambi = {
  ok: boolean;
  motivo?: string;
  tipoCliente?: "cantiere" | "bordo" | "fornitore_misto";
  proformaTotale?: number;
  pagato?: number;
};

/**
 * Step 6 del flusso: per un cliente Bordo l'ordine ricambi ai fornitori
 * è subordinato all'incasso anticipato (proforma + pagamento >= totale).
 * Per Cantiere/fornitore_misto vale il PO e la fatturazione a fine lavoro,
 * quindi nessun blocco.
 */
export async function verificaGateRicambi(praticaId: string): Promise<GateRicambi> {
  const [p] = await db
    .select({ stato: pratiche.stato, tipoCliente: clienti.tipo })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .where(eq(pratiche.id, praticaId))
    .limit(1);

  if (!p) return { ok: false, motivo: "Pratica non trovata." };

  const tipoCliente = p.tipoCliente ?? undefined;

  if (tipoCliente !== "bordo") {
    return { ok: true, tipoCliente };
  }

  // Cliente Bordo: serve proforma incassata (step 5)
  const proformeBordo = await db
    .select({ id: fatture.id, totale: fatture.totale })
    .from(fatture)
    .where(and(eq(fatture.praticaId, praticaId), eq(fatture.tipo, "proforma")));

  if (proformeBordo.length === 0) {
    return {
      ok: false,
      tipoCliente,
      motivo:
        "Cliente Bordo: emettere la fattura proforma e incassare l'anticipo prima di ordinare i ricambi.",
      proformaTotale: 0,
      pagato: 0,
    };
  }

  const proformaTotale = proformeBordo.reduce((s, f) => s + Number(f.totale ?? 0), 0);

  const fatturaIds = proformeBordo.map((f) => f.id);
  const [agg] = await db
    .select({ tot: sum(pagamenti.importo) })
    .from(pagamenti)
    .where(inArray(pagamenti.fatturaId, fatturaIds));
  const pagato = Number(agg?.tot ?? 0);

  if (pagato + 0.01 < proformaTotale) {
    return {
      ok: false,
      tipoCliente,
      proformaTotale,
      pagato,
      motivo: `Cliente Bordo: pagamento anticipato incompleto (incassati € ${pagato.toFixed(
        2
      )} su € ${proformaTotale.toFixed(2)}). Registrare l'incasso prima di ordinare i ricambi.`,
    };
  }

  return { ok: true, tipoCliente, proformaTotale, pagato };
}
