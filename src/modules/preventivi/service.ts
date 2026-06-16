import { db } from "@db/client";
import { preventivi, preventiviRighe } from "@db/schema/preventivi";
import { eq, sql, desc } from "drizzle-orm";

export async function nextNumeroOfferta(annoRif: number): Promise<string> {
  const [r] = await db
    .select({ m: sql<string>`coalesce(max(cast(codice_offerta as integer)), 0)::text` })
    .from(preventivi)
    .where(
      sql`codice_offerta ~ '^[0-9]+$' AND extract(year from created_at) = ${annoRif}`
    );
  return String(parseInt(r?.m ?? "0") + 1);
}

export async function recalcTotali(preventivoId: string) {
  const righe = await db
    .select()
    .from(preventiviRighe)
    .where(eq(preventiviRighe.preventivoId, preventivoId));
  const netto = righe.reduce((sum, r) => {
    const qta = parseFloat(r.quantita ?? "1");
    const pu = parseFloat(r.prezzoUnitario ?? "0");
    const sc = parseFloat(r.sconto ?? "0") / 100;
    return sum + qta * pu * (1 - sc);
  }, 0);

  const [p] = await db.select().from(preventivi).where(eq(preventivi.id, preventivoId)).limit(1);
  if (!p) return;
  const iva = parseFloat(p.iva ?? "22") / 100;
  const lordo = netto * (1 + iva);
  await db
    .update(preventivi)
    .set({
      totaleNetto: netto.toFixed(2),
      totaleLordo: lordo.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(preventivi.id, preventivoId));
}

export async function recalcRiga(rigaId: string) {
  const [r] = await db.select().from(preventiviRighe).where(eq(preventiviRighe.id, rigaId)).limit(1);
  if (!r) return;
  const qta = parseFloat(r.quantita ?? "1");
  const pu = parseFloat(r.prezzoUnitario ?? "0");
  const sc = parseFloat(r.sconto ?? "0") / 100;
  const importo = qta * pu * (1 - sc);
  await db
    .update(preventiviRighe)
    .set({ importo: importo.toFixed(2) })
    .where(eq(preventiviRighe.id, rigaId));
}
