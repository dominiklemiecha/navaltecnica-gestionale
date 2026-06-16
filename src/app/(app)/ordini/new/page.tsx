import { redirect } from "next/navigation";
import { db } from "@db/client";
import { ordini } from "@db/schema/ordini";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni, fornitori } from "@db/schema/anagrafiche";
import { asc, desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verificaGateRicambi } from "@/modules/ordini/service";

export default async function NewOrdine({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const [pratList, fornList] = await Promise.all([
    db
      .select({
        id: pratiche.id,
        codice: pratiche.codice,
        anno: pratiche.annoRiferimento,
        cliente: clienti.ragioneSociale,
        tipoCliente: clienti.tipo,
        imb: imbarcazioni.nome,
      })
      .from(pratiche)
      .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
      .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
      .orderBy(desc(pratiche.createdAt))
      .limit(200),
    db.select().from(fornitori).orderBy(asc(fornitori.ragioneSociale)),
  ]);

  async function create(formData: FormData) {
    "use server";
    const tipo = (String(formData.get("tipo")) || "fornitore_out") as any;
    const praticaId = (String(formData.get("praticaId") || "") || null) as string | null;

    // Step 6: gate incasso per ordini a fornitore di clienti Bordo
    if (tipo === "fornitore_out" && praticaId) {
      const gate = await verificaGateRicambi(praticaId);
      if (!gate.ok) {
        redirect(`/ordini/new?err=${encodeURIComponent(gate.motivo ?? "Ordine bloccato.")}`);
      }
    }

    await db
      .insert(ordini)
      .values({
        tipo,
        praticaId: praticaId as any,
        numero: String(formData.get("numero")),
        fornitoreId: (String(formData.get("fornitoreId") || "") || null) as any,
        dataOrdine: (String(formData.get("dataOrdine") || "") || null) as any,
        dataConsegnaPrevista: (String(formData.get("dataConsegnaPrevista") || "") || null) as any,
        importo: (String(formData.get("importo") || "") || null) as any,
        note: (String(formData.get("note") || "").trim() || null) as any,
      })
      .returning({ id: ordini.id });
    redirect(`/ordini`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuovo ordine</h1>
      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⛔ {err}
        </div>
      )}
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        ℹ️ Per i clienti <strong>Bordo</strong> l&apos;ordine ai fornitori è consentito solo dopo
        l&apos;incasso dell&apos;anticipo (proforma pagata). Per i <strong>Cantieri</strong> vale il PO.
      </div>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <select
              name="tipo"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="fornitore_out">Ordine a fornitore</option>
              <option value="cliente_in">PO ricevuto da cliente</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Numero *</Label>
            <Input name="numero" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Pratica collegata</Label>
          <select
            name="praticaId"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {pratList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codice}/{String(p.anno).slice(-2)} · {p.cliente} · {p.imb ?? "—"}
                {p.tipoCliente === "bordo" ? " [BORDO]" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Fornitore</Label>
          <select
            name="fornitoreId"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {fornList.map((f) => (
              <option key={f.id} value={f.id}>{f.ragioneSociale}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Data ordine</Label>
            <Input name="dataOrdine" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Consegna prevista</Label>
            <Input name="dataConsegnaPrevista" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Importo €</Label>
            <Input name="importo" type="number" step="0.01" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Note</Label>
          <textarea name="note" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <Button type="submit">Crea ordine</Button>
      </form>
    </div>
  );
}
