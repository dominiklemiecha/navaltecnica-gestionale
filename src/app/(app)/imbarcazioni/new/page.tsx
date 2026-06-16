import { redirect } from "next/navigation";
import { db } from "@db/client";
import { imbarcazioni, clienti } from "@db/schema/anagrafiche";
import { asc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewImbarcazione() {
  const cantieri = await db
    .select({ id: clienti.id, nome: clienti.ragioneSociale })
    .from(clienti)
    .where(eq(clienti.tipo, "cantiere"))
    .orderBy(asc(clienti.ragioneSociale));

  async function create(formData: FormData) {
    "use server";
    const [r] = await db
      .insert(imbarcazioni)
      .values({
        nome: (String(formData.get("nome") ?? "").trim() || null) as any,
        hullNumber: (String(formData.get("hullNumber") ?? "").trim() || null) as any,
        modello: (String(formData.get("modello") ?? "").trim() || null) as any,
        cantiereCostruttoreId: (String(formData.get("cantiereId") ?? "") || null) as any,
        armatore: (String(formData.get("armatore") ?? "").trim() || null) as any,
        metri: (String(formData.get("metri") ?? "").trim() || null) as any,
        annoCostruzione: formData.get("annoCostruzione")
          ? parseInt(String(formData.get("annoCostruzione")))
          : null,
        bandiera: (String(formData.get("bandiera") ?? "").trim() || null) as any,
      })
      .returning();
    redirect(`/imbarcazioni/${r.id}`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuova imbarcazione</h1>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input name="nome" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hull number</Label>
            <Input name="hullNumber" />
          </div>
          <div className="space-y-2">
            <Label>Modello</Label>
            <Input name="modello" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cantiere costruttore</Label>
          <select
            name="cantiereId"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {cantieri.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Metri</Label>
            <Input name="metri" type="number" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label>Anno</Label>
            <Input name="annoCostruzione" type="number" />
          </div>
          <div className="space-y-2">
            <Label>Bandiera</Label>
            <Input name="bandiera" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Armatore</Label>
          <Input name="armatore" />
        </div>
        <Button type="submit">Crea</Button>
      </form>
    </div>
  );
}
