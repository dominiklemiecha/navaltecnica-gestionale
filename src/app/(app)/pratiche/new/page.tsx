import { redirect } from "next/navigation";
import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni, sedi } from "@db/schema/anagrafiche";
import { asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nextCodicePratica } from "@/modules/pratiche/service";

export default async function NewPratica({
  searchParams,
}: {
  searchParams: Promise<{ imbarcazioneId?: string; clienteId?: string }>;
}) {
  const sp = await searchParams;
  const [clientiList, imbList, sediList] = await Promise.all([
    db.select({ id: clienti.id, nome: clienti.ragioneSociale, tipo: clienti.tipo }).from(clienti).orderBy(asc(clienti.ragioneSociale)),
    db.select({ id: imbarcazioni.id, nome: imbarcazioni.nome, hull: imbarcazioni.hullNumber }).from(imbarcazioni).orderBy(asc(imbarcazioni.nome)),
    db.select().from(sedi).orderBy(asc(sedi.nome)),
  ]);

  async function create(formData: FormData) {
    "use server";
    const anno = new Date().getFullYear();
    const codice = await nextCodicePratica(anno);
    const [p] = await db
      .insert(pratiche)
      .values({
        codice,
        annoRiferimento: anno,
        clienteId: String(formData.get("clienteId") ?? ""),
        imbarcazioneId: (String(formData.get("imbarcazioneId") ?? "") || null) as any,
        sedeInterventoId: (String(formData.get("sedeInterventoId") ?? "") || null) as any,
        tipoLavoro: (String(formData.get("tipoLavoro") ?? "") || null) as any,
        descrizioneProblema: (String(formData.get("descrizioneProblema") ?? "").trim() || null) as any,
        tempisticheRichieste: (String(formData.get("tempisticheRichieste") ?? "").trim() || null) as any,
        stato: "richiesta",
      })
      .returning();
    redirect(`/pratiche/${p.id}`);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuova pratica</h1>
      <p className="text-sm text-muted-foreground">
        Step 1-4 del flusso: ricezione richiesta → apertura pratica. Stato iniziale:{" "}
        <b>richiesta</b>.
      </p>
      <form action={create} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <select
            name="clienteId"
            required
            defaultValue={sp.clienteId ?? ""}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleziona cliente...</option>
            {clientiList.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.tipo}] {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Imbarcazione</Label>
            <select
              name="imbarcazioneId"
              defaultValue={sp.imbarcazioneId ?? ""}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {imbList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome ?? "(senza nome)"} {i.hull && `· ${i.hull}`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Sede intervento</Label>
            <select
              name="sedeInterventoId"
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
        <div className="space-y-2">
          <Label>Tipo lavoro</Label>
          <select
            name="tipoLavoro"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            <option value="TG_A">TG A (smontaggio/montaggio)</option>
            <option value="TG_A_1F">TG A + 1F</option>
            <option value="TG_A_2F">TG A + 2F</option>
            <option value="TG_B">TG B</option>
            <option value="TG_S">TG S (service)</option>
            <option value="TG_AVV">Avviamento</option>
            <option value="TG_WARR">Warranty</option>
            <option value="TG_ISP">Ispezione</option>
            <option value="MAN_1Y">Manutenzione 1Y</option>
            <option value="MAN_2Y">Manutenzione 2Y</option>
            <option value="EXTRA">Extra</option>
            <option value="FORNITURA">Fornitura</option>
            <option value="TRAINING">Training</option>
            <option value="ALTRO">Altro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Problema segnalato</Label>
          <textarea
            name="descrizioneProblema"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>Tempistiche richieste</Label>
          <Input name="tempisticheRichieste" placeholder="Es. Entro fine mese, urgente, ..." />
        </div>
        <Button type="submit">Apri pratica</Button>
      </form>
    </div>
  );
}
