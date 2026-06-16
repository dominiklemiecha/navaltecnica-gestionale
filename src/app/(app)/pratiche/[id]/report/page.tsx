import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { reportInterventi, reportMateriali } from "@db/schema/field-report";
import { tecnici, clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { eq, asc, desc, and, max } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { transizionePratica, nextCodicePratica } from "@/modules/pratiche/service";
import { revalidatePath } from "next/cache";

export default async function ReportPraticaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select().from(pratiche).where(eq(pratiche.id, id)).limit(1);
  if (!p) notFound();

  const reports = await db
    .select({
      r: reportInterventi,
      tNome: tecnici.nome,
      tCog: tecnici.cognome,
    })
    .from(reportInterventi)
    .leftJoin(tecnici, eq(tecnici.id, reportInterventi.tecnicoCompilatoreId))
    .where(eq(reportInterventi.praticaId, id))
    .orderBy(desc(reportInterventi.dataIntervento));

  const tecniciList = await db
    .select({ id: tecnici.id, nome: tecnici.nome, cognome: tecnici.cognome })
    .from(tecnici)
    .where(eq(tecnici.attivo, true))
    .orderBy(asc(tecnici.nome));

  async function creaReport(formData: FormData) {
    "use server";
    const anomalie = (String(formData.get("anomalie") ?? "").trim() || null) as string | null;
    const generaExtra = !!anomalie && formData.get("generaExtra") === "on";

    let extraPraticaId: string | null = null;
    if (generaExtra) {
      const anno = new Date().getFullYear();
      const codice = await nextCodicePratica(anno);
      const [np] = await db
        .insert(pratiche)
        .values({
          codice,
          annoRiferimento: anno,
          clienteId: p.clienteId,
          imbarcazioneId: p.imbarcazioneId,
          sedeInterventoId: p.sedeInterventoId,
          stato: "richiesta" as any,
          tipoLavoro: "EXTRA" as any,
          praticaPadreId: id,
          descrizioneProblema: anomalie,
        })
        .returning({ id: pratiche.id });
      extraPraticaId = np.id;
    }

    const [r] = await db
      .insert(reportInterventi)
      .values({
        praticaId: id,
        tecnicoCompilatoreId: String(formData.get("tecnicoId")),
        dataIntervento: String(formData.get("data")),
        orarioInizio: (String(formData.get("orarioInizio") || "") || null) as any,
        orarioFine: (String(formData.get("orarioFine") || "") || null) as any,
        oreLavorate: (String(formData.get("oreLavorate") || "") || null) as any,
        descrizioneAttivita: (String(formData.get("descrizione") ?? "").trim() || null) as any,
        anomalie: anomalie as any,
        generaExtra,
        extraPraticaId: extraPraticaId as any,
        nomeClienteFirma: (String(formData.get("nomeClienteFirma") || "") || null) as any,
        stato: (formData.get("invia") ? "inviato" : "bozza") as any,
        inviatoAt: formData.get("invia") ? new Date() : null,
      })
      .returning({ id: reportInterventi.id });

    if (formData.get("invia") && p.stato === "in_esecuzione") {
      await transizionePratica({
        praticaId: id,
        evento: "report_inviato",
        statoTarget: "chiusura_tecnica",
        payload: { reportId: r.id },
      });
    }

    revalidatePath(`/pratiche/${id}/report`);
    if (extraPraticaId) redirect(`/pratiche/${extraPraticaId}`);
    redirect(`/pratiche/${id}/report`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/pratiche/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Pratica {p.codice}/{String(p.annoRiferimento).slice(-2)}
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Report intervento</h1>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Report esistenti ({reports.length})</h2>
        <ul className="text-sm divide-y">
          {reports.map((r) => (
            <li key={r.r.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="font-medium">{formatDate(r.r.dataIntervento)}</span>
                <span className="ml-3 text-muted-foreground">
                  {r.tNome} {r.tCog ?? ""} · {r.r.oreLavorate ?? 0}h
                </span>
                {r.r.anomalie && (
                  <span className="ml-3 text-amber-700">⚠ Anomalie rilevate</span>
                )}
              </span>
              <span className="text-xs rounded bg-secondary px-2 py-0.5">{r.r.stato}</span>
            </li>
          ))}
          {reports.length === 0 && (
            <li className="py-3 text-muted-foreground">Nessun report ancora.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Nuovo report</h2>
        <form action={creaReport} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tecnico compilatore *</Label>
              <select
                name="tecnicoId"
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleziona...</option>
                {tecniciList.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome} {t.cognome ?? ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Data intervento *</Label>
              <Input name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Orario inizio</Label>
              <Input name="orarioInizio" type="time" />
            </div>
            <div className="space-y-2">
              <Label>Orario fine</Label>
              <Input name="orarioFine" type="time" />
            </div>
            <div className="space-y-2">
              <Label>Ore lavorate</Label>
              <Input name="oreLavorate" type="number" step="0.25" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrizione attività *</Label>
            <textarea
              name="descrizione"
              required
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Es. Montaggio impianto HL Cont Compact 0125, prove funzionali, ..."
            />
          </div>
          <div className="space-y-2">
            <Label>Anomalie rilevate (se presenti)</Label>
            <textarea
              name="anomalie"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Eventuali anomalie → genera nuova pratica EXTRA con stesso iter"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="generaExtra" />
              Crea pratica EXTRA collegata per gestire le anomalie
            </label>
          </div>
          <div className="space-y-2">
            <Label>Nome cliente che firma</Label>
            <Input name="nomeClienteFirma" placeholder="Es. Sig. Rossi (Capitano)" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">Salva bozza</Button>
            <Button type="submit" name="invia" value="1">Invia report</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
