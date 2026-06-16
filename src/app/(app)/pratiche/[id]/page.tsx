import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { pratiche, transizioniPratica } from "@db/schema/pratiche";
import { preventivi as preventiviTbl } from "@db/schema/preventivi";
import { fatture } from "@db/schema/fatturazione";
import { assegnazioniIntervento } from "@db/schema/pianificazione";
import { clienti, imbarcazioni, sedi, tecnici } from "@db/schema/anagrafiche";
import { eq, desc, asc } from "drizzle-orm";
import { nextNumeroOfferta } from "@/modules/preventivi/service";
import { Input } from "@/components/ui/input";
import { formatDate, formatEur } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { transizioniDisponibili, transizionePratica, type StatoPratica } from "@/modules/pratiche/service";
import { verificaGateRicambi } from "@/modules/ordini/service";
import {
  generaProformaDaPreventivo,
  registraPagamento,
  statoIncassoPratica,
} from "@/modules/fatturazione/service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function PraticaDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { err, ok } = await searchParams;
  const [row] = await db
    .select({
      p: pratiche,
      cliente: clienti,
      imb: imbarcazioni,
      sede: sedi,
    })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .leftJoin(sedi, eq(sedi.id, pratiche.sedeInterventoId))
    .where(eq(pratiche.id, id))
    .limit(1);
  if (!row) notFound();

  const storia = await db
    .select()
    .from(transizioniPratica)
    .where(eq(transizioniPratica.praticaId, id))
    .orderBy(desc(transizioniPratica.createdAt));

  const preventiviPratica = await db
    .select()
    .from(preventiviTbl)
    .where(eq(preventiviTbl.praticaId, id))
    .orderBy(desc(preventiviTbl.createdAt));

  const fatturePratica = await db
    .select()
    .from(fatture)
    .where(eq(fatture.praticaId, id))
    .orderBy(desc(fatture.dataEmissione));

  const tipoCliente = row.cliente?.tipo;
  const isBordo = tipoCliente === "bordo";
  const incasso = await statoIncassoPratica(id);

  // Step 5: iter differenziato. Da "accettata" il Bordo passa per la proforma
  // (in_attesa_pagamento), il Cantiere va dritto al materiale (PO).
  let next = transizioniDisponibili(row.p.stato as StatoPratica);
  if (row.p.stato === "accettata") {
    next = next.filter((s) => {
      if (s === "annullata") return true;
      return isBordo ? s === "in_attesa_pagamento" : s === "materiale_in_arrivo";
    });
  }

  const assegnazioni = await db
    .select({
      a: assegnazioniIntervento,
      tNome: tecnici.nome,
      tCog: tecnici.cognome,
      sNome: sedi.nome,
    })
    .from(assegnazioniIntervento)
    .leftJoin(tecnici, eq(tecnici.id, assegnazioniIntervento.tecnicoId))
    .leftJoin(sedi, eq(sedi.id, assegnazioniIntervento.sedeId))
    .where(eq(assegnazioniIntervento.praticaId, id))
    .orderBy(asc(assegnazioniIntervento.data));

  const tecniciList = await db
    .select({ id: tecnici.id, nome: tecnici.nome, cognome: tecnici.cognome })
    .from(tecnici)
    .where(eq(tecnici.attivo, true))
    .orderBy(asc(tecnici.nome));

  const sediList = await db.select().from(sedi).orderBy(asc(sedi.nome));

  async function aggiungiAssegnazione(formData: FormData) {
    "use server";
    await db.insert(assegnazioniIntervento).values({
      praticaId: id,
      tecnicoId: String(formData.get("tecnicoId")),
      sedeId: (String(formData.get("sedeId") || "") || null) as any,
      data: String(formData.get("data")),
      orarioDa: (String(formData.get("orarioDa") || "") || null) as any,
      orarioA: (String(formData.get("orarioA") || "") || null) as any,
      stato: (String(formData.get("stato") || "pianificato")) as any,
      note: (String(formData.get("note") || "").trim() || null) as any,
    });
    if (row.p.stato === "materiale_in_arrivo") {
      const { transizionePratica } = await import("@/modules/pratiche/service");
      await transizionePratica({
        praticaId: id,
        evento: "pianificata",
        statoTarget: "pianificata",
      });
    }
    revalidatePath(`/pratiche/${id}`);
  }

  async function eliminaAssegnazione(formData: FormData) {
    "use server";
    const aid = String(formData.get("aid"));
    await db.delete(assegnazioniIntervento).where(eq(assegnazioniIntervento.id, aid));
    revalidatePath(`/pratiche/${id}`);
  }

  async function creaPreventivo() {
    "use server";
    const numero = await nextNumeroOfferta(new Date().getFullYear());
    const [np] = await db
      .insert(preventiviTbl)
      .values({
        praticaId: id,
        codiceOfferta: numero,
        versione: 1,
        iva: "22" as any,
      })
      .returning({ id: preventiviTbl.id });
    const { redirect } = await import("next/navigation");
    redirect(`/preventivi/${np.id}`);
  }

  async function passaA(formData: FormData) {
    "use server";
    const target = String(formData.get("stato")) as StatoPratica;
    // Step 6: per il Bordo il passaggio a "materiale in arrivo" richiede l'incasso
    if (target === "materiale_in_arrivo") {
      const gate = await verificaGateRicambi(id);
      if (!gate.ok) {
        redirect(`/pratiche/${id}?err=${encodeURIComponent(gate.motivo ?? "Transizione bloccata.")}`);
      }
    }
    await transizionePratica({
      praticaId: id,
      evento: `transizione_manuale:${target}`,
      statoTarget: target,
    });
    revalidatePath(`/pratiche/${id}`);
  }

  async function generaProforma() {
    "use server";
    const res = await generaProformaDaPreventivo(id);
    if (!res.ok) {
      redirect(`/pratiche/${id}?err=${encodeURIComponent(res.motivo)}`);
    }
    redirect(`/pratiche/${id}?ok=${encodeURIComponent("Proforma generata.")}`);
  }

  async function incassa(formData: FormData) {
    "use server";
    const fatturaId = String(formData.get("fatturaId"));
    const importo = parseFloat(String(formData.get("importo") ?? "0"));
    if (!fatturaId || !(importo > 0)) {
      redirect(`/pratiche/${id}?err=${encodeURIComponent("Importo non valido.")}`);
    }
    await registraPagamento({
      fatturaId,
      praticaId: id,
      importo,
      modalita: String(formData.get("modalita") || "") || undefined,
      riferimento: String(formData.get("riferimento") || "") || undefined,
    });
    redirect(`/pratiche/${id}?ok=${encodeURIComponent("Incasso registrato.")}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/pratiche" className="text-sm text-muted-foreground hover:underline">
          ← Pratiche
        </Link>
        <h1 className="text-2xl font-semibold mt-1 font-mono">
          {row.p.codice}/{String(row.p.annoRiferimento).slice(-2)}
        </h1>
        <div className="text-sm text-muted-foreground">
          {row.cliente?.ragioneSociale} {row.imb?.nome && `· ${row.imb.nome}`}{" "}
          {row.sede?.nome && `· ${row.sede.nome}`}
        </div>
        <div className="mt-2 flex gap-2">
          <Link
            href={`/pratiche/${id}/report`}
            className="text-sm rounded border px-3 py-1 hover:bg-accent"
          >
            📋 Report interventi
          </Link>
          <Link
            href={`/pratiche/${id}/storico`}
            className="text-sm rounded border px-3 py-1 hover:bg-accent"
          >
            🕓 Storico completo
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⛔ {err}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ {ok}
        </div>
      )}

      {/* Step indicator visuale */}
      <StepIndicator stato={row.p.stato} tipoCliente={row.cliente?.tipo} />

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Stato attuale</div>
            <div className="text-lg font-semibold">
              <StatoLabel value={row.p.stato} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{prossimaAzione(row.p.stato)}</div>
          </div>
          {next.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {next.map((s) => {
                const colorClass =
                  s === "annullata"
                    ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                    : "";
                return (
                  <form key={s} action={passaA}>
                    <input type="hidden" name="stato" value={s} />
                    <Button
                      type="submit"
                      variant={s === "annullata" ? "outline" : "default"}
                      className={colorClass}
                    >
                      → {STATO_INFO[s]?.label ?? s}
                    </Button>
                  </form>
                );
              })}
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Tipo lavoro</dt>
          <dd>{row.p.tipoLavoro ?? "—"}</dd>
          <dt className="text-muted-foreground">Apertura</dt>
          <dd>{formatDate(row.p.dataApertura)}</dd>
          <dt className="text-muted-foreground">Chiusura</dt>
          <dd>{formatDate(row.p.dataChiusura)}</dd>
          <dt className="text-muted-foreground">Problema</dt>
          <dd className="whitespace-pre-wrap">{row.p.descrizioneProblema ?? "—"}</dd>
          <dt className="text-muted-foreground">Tempistiche</dt>
          <dd>{row.p.tempisticheRichieste ?? "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Storico stati</h2>
        <ul className="text-sm divide-y">
          {storia.map((t) => (
            <li key={t.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="text-muted-foreground">{t.statoDa ?? "(iniziale)"}</span> →{" "}
                <span className="font-medium">{t.statoA}</span>
                <span className="ml-2 text-xs text-muted-foreground">{t.evento}</span>
              </span>
              <span className="text-muted-foreground text-xs">{formatDate(t.createdAt)}</span>
            </li>
          ))}
          {storia.length === 0 && (
            <li className="py-3 text-muted-foreground">Nessuna transizione registrata.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Pianificazione interventi ({assegnazioni.length})</h2>
        <ul className="text-sm divide-y mb-4">
          {assegnazioni.map((a) => (
            <li key={a.a.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="font-medium">{formatDate(a.a.data)}</span>
                {a.a.orarioDa && <span> · {a.a.orarioDa}–{a.a.orarioA}</span>}
                <span className="ml-3 text-muted-foreground">
                  {a.sNome} · {a.tNome} {a.tCog ?? ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs rounded bg-secondary px-2 py-0.5">{a.a.stato}</span>
                <form action={eliminaAssegnazione}>
                  <input type="hidden" name="aid" value={a.a.id} />
                  <button className="text-destructive text-xs hover:underline">elimina</button>
                </form>
              </span>
            </li>
          ))}
          {assegnazioni.length === 0 && (
            <li className="py-3 text-muted-foreground">Nessuna assegnazione.</li>
          )}
        </ul>
        <form action={aggiungiAssegnazione} className="grid grid-cols-12 gap-2 items-end pt-3 border-t">
          <div className="col-span-3">
            <label className="text-xs text-muted-foreground">Tecnico</label>
            <select
              name="tecnicoId"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Seleziona...</option>
              {tecniciList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} {t.cognome ?? ""}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className="text-xs text-muted-foreground">Sede</label>
            <select
              name="sedeId"
              defaultValue={row.p.sedeInterventoId ?? ""}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">—</option>
              {sediList.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Data</label>
            <Input name="data" type="date" required />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-muted-foreground">Da</label>
            <Input name="orarioDa" type="time" />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-muted-foreground">A</label>
            <Input name="orarioA" type="time" />
          </div>
          <div className="col-span-2">
            <Button type="submit" className="w-full">+ Assegna</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Preventivi ({preventiviPratica.length})</h2>
          <form action={creaPreventivo}>
            <Button type="submit" variant="secondary">+ Nuovo preventivo</Button>
          </form>
        </div>
        <ul className="text-sm divide-y">
          {preventiviPratica.map((pv) => (
            <li key={pv.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="font-mono">{pv.codiceOfferta}</span>
                {pv.versione > 1 && (
                  <span className="text-muted-foreground"> rev {pv.versione}</span>
                )}
                <span className="ml-3 text-muted-foreground">
                  {pv.dataAccettazione
                    ? `Accettato ${formatDate(pv.dataAccettazione)} (${pv.modalitaAccettazione})`
                    : pv.dataInvio
                    ? `Inviato ${formatDate(pv.dataInvio)}`
                    : "Bozza"}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {pv.totaleNetto ? `€ ${pv.totaleNetto}` : "—"}
                </span>
                <Link className="text-primary hover:underline" href={`/preventivi/${pv.id}`}>
                  Apri
                </Link>
              </span>
            </li>
          ))}
          {preventiviPratica.length === 0 && (
            <li className="py-3 text-muted-foreground">Nessun preventivo. Creane uno con il pulsante sopra.</li>
          )}
        </ul>
      </section>

      {isBordo && ["accettata", "in_attesa_pagamento"].includes(row.p.stato) && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-1">Iter amministrativo Bordo</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Cliente privato: incasso anticipato totale tramite proforma prima di ordinare i ricambi.
          </p>
          {!incasso.hasProforma ? (
            <form action={generaProforma}>
              <Button type="submit">Genera proforma da preventivo accettato</Button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Proforma totale: <strong>{formatEur(incasso.totaleProforme.toFixed(2))}</strong>
                </span>
                <span>
                  Incassato: <strong>{formatEur(incasso.pagato.toFixed(2))}</strong>
                </span>
                {incasso.saldato ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                    ✓ Saldato
                  </span>
                ) : (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    Residuo {formatEur((incasso.totaleProforme - incasso.pagato).toFixed(2))}
                  </span>
                )}
              </div>
              {!incasso.saldato && fatturePratica.find((f) => f.tipo === "proforma") && (
                <form action={incassa} className="flex flex-wrap gap-2 items-end border-t pt-3">
                  <input
                    type="hidden"
                    name="fatturaId"
                    value={fatturePratica.find((f) => f.tipo === "proforma")!.id}
                  />
                  <div>
                    <label className="text-xs text-muted-foreground block">Importo €</label>
                    <Input
                      name="importo"
                      type="number"
                      step="0.01"
                      defaultValue={(incasso.totaleProforme - incasso.pagato).toFixed(2)}
                      className="w-32"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block">Modalità</label>
                    <Input name="modalita" placeholder="bonifico…" className="w-36" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block">Riferimento</label>
                    <Input name="riferimento" placeholder="CRO / nota" className="w-40" />
                  </div>
                  <Button type="submit">Registra incasso</Button>
                </form>
              )}
              {incasso.saldato && (
                <p className="text-xs text-emerald-700">
                  Incasso completo: la pratica può procedere all&apos;ordine ricambi e alla pianificazione.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Fatture ({fatturePratica.length})</h2>
          <Link
            href={`/fatture/new?praticaId=${id}`}
            className="text-sm rounded border px-3 py-1 hover:bg-accent"
          >
            + Emetti fattura
          </Link>
        </div>
        <ul className="text-sm divide-y">
          {fatturePratica.map((f) => (
            <li key={f.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="font-mono">{f.numero}/{f.annoFiscale}</span>
                <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs">{f.tipo}</span>
                <span className="ml-3 text-muted-foreground">{formatDate(f.dataEmissione)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span>€ {f.totale}</span>
                <span className="text-xs rounded bg-amber-100 px-2 py-0.5">{f.stato}</span>
              </span>
            </li>
          ))}
          {fatturePratica.length === 0 && (
            <li className="py-3 text-muted-foreground">Nessuna fattura.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

const STATO_INFO: Record<string, { label: string; color: string; step: number }> = {
  richiesta: { label: "Richiesta", color: "bg-slate-100", step: 1 },
  offerta: { label: "Offerta", color: "bg-blue-100", step: 2 },
  in_attesa_accettazione: { label: "Att. accettazione", color: "bg-amber-100", step: 3 },
  accettata: { label: "Accettata", color: "bg-green-100", step: 4 },
  in_attesa_pagamento: { label: "Att. pagamento", color: "bg-amber-100", step: 5 },
  materiale_in_arrivo: { label: "Materiale in arrivo", color: "bg-cyan-100", step: 6 },
  pianificata: { label: "Pianificata", color: "bg-indigo-100", step: 7 },
  in_esecuzione: { label: "In esecuzione", color: "bg-purple-100", step: 8 },
  chiusura_tecnica: { label: "Chiusura tecnica", color: "bg-violet-100", step: 9 },
  da_fatturare: { label: "Da fatturare", color: "bg-orange-100", step: 10 },
  chiusa: { label: "Chiusa", color: "bg-emerald-100", step: 10 },
  annullata: { label: "Annullata", color: "bg-rose-100", step: 0 },
};

function StatoLabel({ value }: { value: string }) {
  const info = STATO_INFO[value];
  return <span className={`rounded px-2 py-0.5 text-xs ${info?.color ?? "bg-muted"}`}>{info?.label ?? value}</span>;
}

function prossimaAzione(stato: string): string {
  const azioni: Record<string, string> = {
    richiesta: "👉 Prepara il preventivo e segnalo come 'Offerta'",
    offerta: "👉 Invialo al cliente e segnalo 'In attesa accettazione'",
    in_attesa_accettazione: "👉 Quando arriva firma o PO, segnalo 'Accettata'",
    accettata: "👉 Emetti proforma (Bordo) o ordina ricambi (Cantiere)",
    in_attesa_pagamento: "👉 Verifica pagamento ricevuto → 'Materiale in arrivo'",
    materiale_in_arrivo: "👉 Monitora consegna ricambi e pianifica i tecnici",
    pianificata: "👉 Conferma l'intervento ai tecnici → al via 'In esecuzione'",
    in_esecuzione: "👉 Compila il report intervento al termine",
    chiusura_tecnica: "👉 Invia report e certificati al cliente → 'Da fatturare'",
    da_fatturare: "👉 Emetti fattura finale (o SAL per i cantieri)",
    chiusa: "✓ Pratica completata e archiviata",
    annullata: "✗ Pratica annullata",
  };
  return azioni[stato] ?? "";
}

const FLUSSO_BORDO = [
  "richiesta",
  "offerta",
  "in_attesa_accettazione",
  "accettata",
  "in_attesa_pagamento",
  "materiale_in_arrivo",
  "pianificata",
  "in_esecuzione",
  "chiusura_tecnica",
  "da_fatturare",
  "chiusa",
];
const FLUSSO_CANTIERE = [
  "richiesta",
  "offerta",
  "in_attesa_accettazione",
  "accettata",
  "materiale_in_arrivo",
  "pianificata",
  "in_esecuzione",
  "chiusura_tecnica",
  "da_fatturare",
  "chiusa",
];

function StepIndicator({ stato, tipoCliente }: { stato: string; tipoCliente?: string }) {
  if (stato === "annullata") {
    return (
      <div className="rounded-lg border bg-rose-50 border-rose-200 p-3 text-sm text-rose-900">
        Pratica annullata
      </div>
    );
  }
  const flusso = tipoCliente === "bordo" ? FLUSSO_BORDO : FLUSSO_CANTIERE;
  const idx = flusso.indexOf(stato);
  return (
    <div className="rounded-lg border bg-card p-3 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max text-[10px]">
        {flusso.map((s, i) => {
          const info = STATO_INFO[s];
          const done = i < idx;
          const current = i === idx;
          return (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex flex-col items-center gap-0.5 ${
                  current ? "" : done ? "opacity-70" : "opacity-40"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    current
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : done
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div className={`whitespace-nowrap ${current ? "font-semibold" : ""}`}>
                  {info.label}
                </div>
              </div>
              {i < flusso.length - 1 && (
                <div
                  className={`h-px w-6 ${i < idx ? "bg-emerald-500" : "bg-muted"}`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-muted-foreground mt-2">
        Flusso {tipoCliente === "bordo" ? "Bordo (cliente privato)" : "Cantiere"} secondo PDF aziendale
      </div>
    </div>
  );
}
