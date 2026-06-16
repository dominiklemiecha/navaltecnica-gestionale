import { redirect } from "next/navigation";
import { db } from "@db/client";
import { clienti } from "@db/schema/anagrafiche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewCliente() {
  async function create(formData: FormData) {
    "use server";
    const tipo = String(formData.get("tipo") ?? "cantiere") as "cantiere" | "bordo";
    const [c] = await db
      .insert(clienti)
      .values({
        tipo,
        ragioneSociale: String(formData.get("ragioneSociale") ?? "").trim(),
        nomeBreve: (String(formData.get("nomeBreve") ?? "").trim() || null) as any,
        partitaIva: (String(formData.get("partitaIva") ?? "").trim() || null) as any,
        codiceFiscale: (String(formData.get("codiceFiscale") ?? "").trim() || null) as any,
        indirizzo: (String(formData.get("indirizzo") ?? "").trim() || null) as any,
        citta: (String(formData.get("citta") ?? "").trim() || null) as any,
        cap: (String(formData.get("cap") ?? "").trim() || null) as any,
        pec: (String(formData.get("pec") ?? "").trim() || null) as any,
        sdiCode: (String(formData.get("sdiCode") ?? "").trim() || null) as any,
        terminiPagamentoGiorni: formData.get("terminiPagamentoGiorni")
          ? parseInt(String(formData.get("terminiPagamentoGiorni")))
          : null,
      })
      .returning();
    redirect(`/clienti/${c.id}`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuovo cliente</h1>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <select
            name="tipo"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="cantiere">Cantiere</option>
            <option value="bordo">Bordo</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Ragione sociale *</Label>
          <Input name="ragioneSociale" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome breve</Label>
            <Input name="nomeBreve" />
          </div>
          <div className="space-y-2">
            <Label>P.IVA</Label>
            <Input name="partitaIva" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Codice Fiscale</Label>
            <Input name="codiceFiscale" />
          </div>
          <div className="space-y-2">
            <Label>SDI</Label>
            <Input name="sdiCode" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Indirizzo</Label>
          <Input name="indirizzo" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Città</Label>
            <Input name="citta" />
          </div>
          <div className="space-y-2">
            <Label>CAP</Label>
            <Input name="cap" />
          </div>
          <div className="space-y-2">
            <Label>Pag. (gg)</Label>
            <Input name="terminiPagamentoGiorni" type="number" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>PEC</Label>
          <Input name="pec" type="email" />
        </div>
        <Button type="submit">Crea cliente</Button>
      </form>
    </div>
  );
}
