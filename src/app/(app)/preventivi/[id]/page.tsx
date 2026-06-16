import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { preventivi, preventiviRighe } from "@db/schema/preventivi";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { listiniCantiere, listiniRighe, listiniScafoPersonalizzati } from "@db/schema/listini";
import { eq, asc, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatEur } from "@/lib/utils";
import { recalcRiga, recalcTotali } from "@/modules/preventivi/service";
import { AutoSubmitInput } from "@/components/autosubmit-input";
import { transizionePratica } from "@/modules/pratiche/service";
import { revalidatePath } from "next/cache";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { documenti } from "@db/schema/documenti";
import { auth } from "@/lib/auth";

export default async function PreventivoDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id } = await params;
  const { err } = await searchParams;
  const [row] = await db
    .select({ p: preventivi, pr: pratiche, cli: clienti, imb: imbarcazioni })
    .from(preventivi)
    .leftJoin(pratiche, eq(pratiche.id, preventivi.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(eq(preventivi.id, id))
    .limit(1);
  if (!row) notFound();

  const righe = await db
    .select()
    .from(preventiviRighe)
    .where(eq(preventiviRighe.preventivoId, id))
    .orderBy(asc(preventiviRighe.ordine), asc(preventiviRighe.tipo));

  // Suggerimenti listino cantiere: cerco listino del cantiere costruttore della barca
  const cantiereId = row.imb?.cantiereCostruttoreId;
  const [listinoCantiere] = cantiereId
    ? await db
        .select()
        .from(listiniCantiere)
        .where(eq(listiniCantiere.cantiereId, cantiereId))
        .limit(1)
    : [null];
  const suggArt = listinoCantiere
    ? await db
        .select()
        .from(listiniRighe)
        .where(eq(listiniRighe.listinoId, listinoCantiere.id))
        .orderBy(asc(listiniRighe.descrizioneArticolo))
        .limit(200)
    : [];
  const suggScafo =
    listinoCantiere && row.imb?.hullNumber
      ? await db
          .select()
          .from(listiniScafoPersonalizzati)
          .where(
            and(
              eq(listiniScafoPersonalizzati.listinoId, listinoCantiere.id),
              eq(listiniScafoPersonalizzati.hullNumber, row.imb.hullNumber)
            )
          )
          .orderBy(asc(listiniScafoPersonalizzati.descrizioneArticolo))
      : [];

  async function aggiungiRiga(formData: FormData) {
    "use server";
    const tipo = String(formData.get("tipo") ?? "ricambio") as any;
    const [nuova] = await db
      .insert(preventiviRighe)
      .values({
        preventivoId: id,
        tipo,
        descrizione: String(formData.get("descrizione") ?? "").trim(),
        codiceArticolo: (String(formData.get("codiceArticolo") || "") || null) as any,
        quantita: (String(formData.get("quantita") || "1") || "1") as any,
        prezzoUnitario: (String(formData.get("prezzoUnitario") || "0") || "0") as any,
        sconto: (String(formData.get("sconto") || "0") || "0") as any,
        ordine: righe.length,
      })
      .returning({ id: preventiviRighe.id });
    await recalcRiga(nuova.id);
    await recalcTotali(id);
    revalidatePath(`/preventivi/${id}`);
  }

  async function eliminaRiga(formData: FormData) {
    "use server";
    const rigaId = String(formData.get("rigaId"));
    await db.delete(preventiviRighe).where(eq(preventiviRighe.id, rigaId));
    await recalcTotali(id);
    revalidatePath(`/preventivi/${id}`);
  }

  async function aggiornaSconto(formData: FormData) {
    "use server";
    const rigaId = String(formData.get("rigaId"));
    const sconto = String(formData.get("sconto") ?? "0");
    await db.update(preventiviRighe).set({ sconto }).where(eq(preventiviRighe.id, rigaId));
    await recalcRiga(rigaId);
    await recalcTotali(id);
    revalidatePath(`/preventivi/${id}`);
  }

  async function segnaInviato() {
    "use server";
    await db.update(preventivi).set({ dataInvio: new Date() }).where(eq(preventivi.id, id));
    if (row.pr && row.pr.stato === "richiesta") {
      await transizionePratica({
        praticaId: row.pr.id,
        evento: "preventivo_inviato",
        statoTarget: "offerta",
      });
    }
    if (row.pr && row.pr.stato === "offerta") {
      await transizionePratica({
        praticaId: row.pr.id,
        evento: "in_attesa_accettazione",
        statoTarget: "in_attesa_accettazione",
      });
    }
    revalidatePath(`/preventivi/${id}`);
  }

  async function segnaAccettato(formData: FormData) {
    "use server";
    const modalita = String(formData.get("modalita") ?? "firma") as any;
    const rifPO = (String(formData.get("rifPO") || "") || null) as any;
    const file = formData.get("fileFirmato");

    let fileFirmatoPath: string | null = null;
    if (file instanceof File && file.size > 0) {
      let saved;
      try {
        saved = await saveUploadedFile(file, `preventivi/${id}`);
      } catch (e) {
        if (e instanceof UploadError) {
          redirect(`/preventivi/${id}?err=${encodeURIComponent(e.message)}`);
        }
        throw e;
      }
      fileFirmatoPath = saved.relativePath;
      const session = await auth();
      await db.insert(documenti).values({
        tipo: modalita === "PO" ? "PO_cliente" : "preventivo_firmato",
        praticaId: row.pr?.id ?? null,
        preventivoId: id,
        descrizione:
          modalita === "PO"
            ? `PO cliente${rifPO ? ` ${rifPO}` : ""}`
            : "Preventivo firmato per accettazione",
        filePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        sha256: saved.sha256,
        fileSize: saved.size,
        uploadedBy: (session?.user as any)?.id ?? null,
      });
    }

    await db
      .update(preventivi)
      .set({
        dataAccettazione: new Date(),
        modalitaAccettazione: modalita,
        riferimentoPo: rifPO,
        ...(fileFirmatoPath ? { fileFirmatoPath } : {}),
      })
      .where(eq(preventivi.id, id));
    if (row.pr && ["offerta", "in_attesa_accettazione"].includes(row.pr.stato)) {
      await transizionePratica({
        praticaId: row.pr.id,
        evento: "preventivo_accettato",
        statoTarget: "accettata",
        payload: { modalita, rifPO, hasFile: !!fileFirmatoPath },
      });
    }
    revalidatePath(`/preventivi/${id}`);
  }

  async function caricaFirmatoExPost(formData: FormData) {
    "use server";
    const file = formData.get("fileFirmato");
    if (!(file instanceof File) || file.size === 0) return;
    let saved;
    try {
      saved = await saveUploadedFile(file, `preventivi/${id}`);
    } catch (e) {
      if (e instanceof UploadError) {
        redirect(`/preventivi/${id}?err=${encodeURIComponent(e.message)}`);
      }
      throw e;
    }
    const session = await auth();
    const isPO = row.p.modalitaAccettazione === "PO";
    await db.insert(documenti).values({
      tipo: isPO ? "PO_cliente" : "preventivo_firmato",
      praticaId: row.pr?.id ?? null,
      preventivoId: id,
      descrizione: isPO ? "PO cliente (caricato successivamente)" : "Preventivo firmato (caricato successivamente)",
      filePath: saved.relativePath,
      fileName: saved.fileName,
      mimeType: saved.mimeType,
      sha256: saved.sha256,
      fileSize: saved.size,
      uploadedBy: (session?.user as any)?.id ?? null,
    });
    await db
      .update(preventivi)
      .set({ fileFirmatoPath: saved.relativePath })
      .where(eq(preventivi.id, id));
    revalidatePath(`/preventivi/${id}`);
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⛔ {err}
        </div>
      )}
      <div>
        <Link href="/preventivi" className="text-sm text-muted-foreground hover:underline">
          ← Preventivi
        </Link>
        <h1 className="text-2xl font-semibold mt-1">
          Offerta <span className="font-mono">{row.p.codiceOfferta}</span>
          {row.p.versione > 1 && <span className="text-base text-muted-foreground"> rev {row.p.versione}</span>}
        </h1>
        <div className="text-sm text-muted-foreground">
          Pratica{" "}
          <Link href={`/pratiche/${row.pr?.id}`} className="text-primary hover:underline">
            {row.pr?.codice}/{String(row.pr?.annoRiferimento ?? 0).slice(-2)}
          </Link>{" "}
          · {row.cli?.ragioneSociale} · {row.imb?.nome ?? "—"}{" "}
          {row.imb?.hullNumber && `(${row.imb.hullNumber})`}
        </div>
        <div className="mt-2 flex gap-2">
          <Link
            href={`/preventivi/${id}/stampa`}
            target="_blank"
            className="text-sm rounded border px-3 py-1 hover:bg-accent"
          >
            🖨 Stampa / Esporta PDF
          </Link>
        </div>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Totale netto</div>
            <div className="text-2xl font-semibold">{formatEur(row.p.totaleNetto)}</div>
            <div className="text-xs text-muted-foreground">
              IVA {row.p.iva ?? 22}% · Lordo {formatEur(row.p.totaleLordo)}
            </div>
          </div>
          <div className="flex gap-2">
            {!row.p.dataInvio && (
              <form action={segnaInviato}>
                <Button type="submit" variant="secondary">Segna come inviato</Button>
              </form>
            )}
            {row.p.dataInvio && !row.p.dataAccettazione && (
              <form action={segnaAccettato} encType="multipart/form-data" className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground block">Modalità</label>
                  <select
                    name="modalita"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    defaultValue="firma"
                  >
                    <option value="firma">Firma</option>
                    <option value="PO">PO</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Rif. PO</label>
                  <Input name="rifPO" placeholder="opz." className="w-40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">
                    Documento firmato (PDF)
                  </label>
                  <input
                    type="file"
                    name="fileFirmato"
                    accept="application/pdf,image/*"
                    className="h-10 text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-2 file:text-xs"
                  />
                </div>
                <Button type="submit">Segna accettato</Button>
              </form>
            )}
            {row.p.dataAccettazione && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm rounded bg-green-100 px-3 py-1">
                  ✓ Accettato il {formatDate(row.p.dataAccettazione)} ({row.p.modalitaAccettazione})
                  {row.p.riferimentoPo && ` · PO ${row.p.riferimentoPo}`}
                </span>
                {row.p.fileFirmatoPath ? (
                  <a
                    href={`/api/files/${row.p.fileFirmatoPath}`}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-primary hover:underline"
                  >
                    📎 Scarica documento firmato
                  </a>
                ) : (
                  <form
                    action={caricaFirmatoExPost}
                    encType="multipart/form-data"
                    className="flex items-center gap-2"
                  >
                    <input
                      type="file"
                      name="fileFirmato"
                      required
                      accept="application/pdf,image/*"
                      className="text-xs file:mr-2 file:rounded-md file:border file:bg-secondary file:px-2 file:py-1 file:text-xs"
                    />
                    <Button type="submit" variant="secondary" className="h-7 text-xs">
                      Carica firmato
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Righe ({righe.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Descrizione</th>
                <th className="px-2 py-2">Codice</th>
                <th className="px-2 py-2 text-right">Qta</th>
                <th className="px-2 py-2 text-right">€ unit.</th>
                <th className="px-2 py-2 text-right">Sconto %</th>
                <th className="px-2 py-2 text-right">Importo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-2">
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs">{r.tipo}</span>
                  </td>
                  <td className="px-2 py-2">{r.descrizione}</td>
                  <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                    {r.codiceArticolo ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-right">{r.quantita}</td>
                  <td className="px-2 py-2 text-right">{formatEur(r.prezzoUnitario)}</td>
                  <td className="px-2 py-2 text-right">
                    {!row.p.dataAccettazione ? (
                      <form action={aggiornaSconto} className="inline-flex items-center gap-1">
                        <input type="hidden" name="rigaId" value={r.id} />
                        <AutoSubmitInput
                          name="sconto"
                          defaultValue={String(r.sconto ?? "0")}
                          className="w-14 h-7 rounded border border-input bg-background px-1 text-xs text-right"
                        />
                      </form>
                    ) : (
                      `${r.sconto ?? 0}%`
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{formatEur(r.importo)}</td>
                  <td className="px-2 py-2 text-right">
                    {!row.p.dataAccettazione && (
                      <form action={eliminaRiga}>
                        <input type="hidden" name="rigaId" value={r.id} />
                        <button className="text-destructive text-xs hover:underline">elimina</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {righe.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                    Nessuna riga. Aggiungine una sotto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!row.p.dataAccettazione && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-3">Aggiungi riga</h2>
          <form action={aggiungiRiga} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                name="tipo"
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="ricambio">Ricambio</option>
                <option value="manodopera">Manodopera</option>
                <option value="trasferta">Trasferta</option>
                <option value="officina">Officina</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div className="col-span-4">
              <label className="text-xs text-muted-foreground">Descrizione</label>
              <Input name="descrizione" required list="sugg-articoli" />
              <datalist id="sugg-articoli">
                {suggArt.map((a) => (
                  <option key={a.id} value={a.descrizioneArticolo}>
                    {a.codiceArticolo} — {formatEur(a.prezzoVendita)}
                  </option>
                ))}
                {suggScafo.map((a) => (
                  <option key={a.id} value={a.descrizioneArticolo}>
                    scafo · {formatEur(a.prezzoVendita)}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Codice</label>
              <Input name="codiceArticolo" />
            </div>
            <div className="col-span-1">
              <label className="text-xs text-muted-foreground">Qta</label>
              <Input name="quantita" type="number" step="0.01" defaultValue="1" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">€ unit.</label>
              <Input name="prezzoUnitario" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="col-span-1">
              <Button type="submit" className="w-full">+</Button>
            </div>
          </form>
          {(suggArt.length > 0 || suggScafo.length > 0) && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Suggerimenti articoli dal listino{" "}
              <Link href={`/listini/${listinoCantiere?.id}`} className="text-primary hover:underline">
                {row.imb?.cantiereCostruttoreId ? "del cantiere" : ""}
              </Link>{" "}
              disponibili come autocomplete sulla descrizione.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
