import { redirect } from "next/navigation";
import { db } from "@db/client";
import { listiniCantiere } from "@db/schema/listini";
import { clienti } from "@db/schema/anagrafiche";
import { asc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewListino() {
  const cantieri = await db
    .select({ id: clienti.id, nome: clienti.ragioneSociale })
    .from(clienti)
    .where(eq(clienti.tipo, "cantiere"))
    .orderBy(asc(clienti.ragioneSociale));

  async function create(formData: FormData) {
    "use server";
    const [r] = await db
      .insert(listiniCantiere)
      .values({
        cantiereId: String(formData.get("cantiereId")),
        nome: String(formData.get("nome")),
        validoDa: String(formData.get("validoDa")),
        validoA: (String(formData.get("validoA") || "") || null) as any,
        note: (String(formData.get("note") || "").trim() || null) as any,
      })
      .returning({ id: listiniCantiere.id });
    redirect(`/listini/${r.id}`);
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuovo listino cantiere</h1>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label>Cantiere *</Label>
          <select
            name="cantiereId"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleziona...</option>
            {cantieri.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Nome listino *</Label>
          <Input name="nome" required placeholder="Es. Listino 2026" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valido dal *</Label>
            <Input name="validoDa" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label>Valido al</Label>
            <Input name="validoA" type="date" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Note</Label>
          <textarea
            name="note"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit">Crea listino</Button>
      </form>
    </div>
  );
}
