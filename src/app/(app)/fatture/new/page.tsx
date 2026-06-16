import { redirect } from "next/navigation";
import { db } from "@db/client";
import { fatture } from "@db/schema/fatturazione";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transizionePratica } from "@/modules/pratiche/service";

export default async function NewFattura() {
  const pratList = await db
    .select({
      id: pratiche.id,
      codice: pratiche.codice,
      anno: pratiche.annoRiferimento,
      stato: pratiche.stato,
      cliente: clienti.ragioneSociale,
      imb: imbarcazioni.nome,
    })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .orderBy(desc(pratiche.createdAt))
    .limit(200);

  async function create(formData: FormData) {
    "use server";
    const praticaId = String(formData.get("praticaId"));
    const tipo = String(formData.get("tipo")) as any;
    const netto = parseFloat(String(formData.get("importoNetto") ?? "0"));
    const ivaPerc = parseFloat(String(formData.get("ivaPerc") ?? "22"));
    const ivaAmount = netto * (ivaPerc / 100);
    const totale = netto + ivaAmount;

    const [f] = await db
      .insert(fatture)
      .values({
        praticaId,
        tipo,
        numero: String(formData.get("numero")),
        annoFiscale: String(new Date().getFullYear()),
        dataEmissione: String(formData.get("dataEmissione")),
        importoNetto: netto.toFixed(2),
        iva: ivaAmount.toFixed(2),
        totale: totale.toFixed(2),
        stato: "emessa" as any,
        note: (String(formData.get("note") || "").trim() || null) as any,
      })
      .returning({ id: fatture.id });

    // Transizioni: proforma → in_attesa_pagamento (Bordo) / finale → chiusa
    const [p] = await db.select().from(pratiche).where(eq(pratiche.id, praticaId)).limit(1);
    if (p) {
      if (tipo === "proforma" && p.stato === "accettata") {
        await transizionePratica({
          praticaId,
          evento: "proforma_emessa",
          statoTarget: "in_attesa_pagamento",
        });
      }
      if (tipo === "finale" && p.stato === "da_fatturare") {
        await transizionePratica({
          praticaId,
          evento: "fatturata",
          statoTarget: "chiusa",
        });
      }
    }
    redirect("/fatture");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuova fattura</h1>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label>Pratica *</Label>
          <select
            name="praticaId"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleziona...</option>
            {pratList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codice}/{String(p.anno).slice(-2)} · [{p.stato}] · {p.cliente} · {p.imb ?? "—"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <select
              name="tipo"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="proforma">Proforma</option>
              <option value="SAL">SAL</option>
              <option value="finale">Finale</option>
              <option value="nota_credito">Nota credito</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Numero *</Label>
            <Input name="numero" required />
          </div>
          <div className="space-y-2">
            <Label>Data emissione *</Label>
            <Input
              name="dataEmissione"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Importo netto € *</Label>
            <Input name="importoNetto" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label>IVA %</Label>
            <Input name="ivaPerc" type="number" step="0.1" defaultValue="22" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Note</Label>
          <textarea name="note" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <Button type="submit">Emetti fattura</Button>
      </form>
    </div>
  );
}
