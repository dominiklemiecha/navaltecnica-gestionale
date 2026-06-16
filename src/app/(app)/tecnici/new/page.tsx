import { redirect } from "next/navigation";
import { db } from "@db/client";
import { tecnici, sedi } from "@db/schema/anagrafiche";
import { asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewTecnico() {
  const sediList = await db.select().from(sedi).orderBy(asc(sedi.nome));

  async function create(formData: FormData) {
    "use server";
    await db.insert(tecnici).values({
      nome: String(formData.get("nome") ?? "").trim(),
      cognome: (String(formData.get("cognome") ?? "").trim() || null) as any,
      ruolo: (String(formData.get("ruolo") ?? "tecnico")) as any,
      sedeId: (String(formData.get("sedeId") ?? "") || null) as any,
      email: (String(formData.get("email") ?? "").trim() || null) as any,
      telefono: (String(formData.get("telefono") ?? "").trim() || null) as any,
      costoOrario: (String(formData.get("costoOrario") ?? "").trim() || null) as any,
    });
    redirect("/tecnici");
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuovo tecnico</h1>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input name="nome" required />
          </div>
          <div className="space-y-2">
            <Label>Cognome</Label>
            <Input name="cognome" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ruolo</Label>
            <select
              name="ruolo"
              defaultValue="tecnico"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="tecnico">Tecnico</option>
              <option value="responsabile_linea">Responsabile linea</option>
              <option value="officina">Officina</option>
              <option value="trasferta">Trasferta</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Sede</Label>
            <select
              name="sedeId"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {sediList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input name="telefono" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Costo orario €</Label>
          <Input name="costoOrario" type="number" step="0.01" />
        </div>
        <Button type="submit">Crea</Button>
      </form>
    </div>
  );
}
