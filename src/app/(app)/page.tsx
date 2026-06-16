import Link from "next/link";
import { db } from "@db/client";
import { clienti, imbarcazioni, sedi, tecnici } from "@db/schema/anagrafiche";
import { pratiche } from "@db/schema/pratiche";
import { preventivi } from "@db/schema/preventivi";
import { fatture } from "@db/schema/fatturazione";
import { assegnazioniIntervento } from "@db/schema/pianificazione";
import { and, count, desc, eq, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { formatDate, formatEur } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileText,
  Plus,
  ReceiptText,
  Ship,
} from "lucide-react";

const STATI_AZIONE: { stato: string; label: string; color: string; href: string }[] = [
  { stato: "richiesta", label: "Da preparare offerta", color: "bg-slate-100 text-slate-900", href: "/pratiche?stato=richiesta" },
  { stato: "offerta", label: "Offerte da inviare", color: "bg-blue-100 text-blue-900", href: "/pratiche?stato=offerta" },
  { stato: "in_attesa_accettazione", label: "Att. accettazione", color: "bg-amber-100 text-amber-900", href: "/pratiche?stato=in_attesa_accettazione" },
  { stato: "in_attesa_pagamento", label: "Att. pagamento", color: "bg-amber-100 text-amber-900", href: "/pratiche?stato=in_attesa_pagamento" },
  { stato: "materiale_in_arrivo", label: "Materiale in arrivo", color: "bg-cyan-100 text-cyan-900", href: "/pratiche?stato=materiale_in_arrivo" },
  { stato: "pianificata", label: "Pianificate", color: "bg-indigo-100 text-indigo-900", href: "/pratiche?stato=pianificata" },
  { stato: "in_esecuzione", label: "In esecuzione", color: "bg-purple-100 text-purple-900", href: "/pratiche?stato=in_esecuzione" },
  { stato: "chiusura_tecnica", label: "Chiusura tecnica", color: "bg-violet-100 text-violet-900", href: "/pratiche?stato=chiusura_tecnica" },
  { stato: "da_fatturare", label: "Da fatturare", color: "bg-orange-100 text-orange-900", href: "/pratiche?stato=da_fatturare" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function Dashboard() {
  const today = todayISO();
  const oraNow = new Date();
  const inSettePiu = new Date(oraNow);
  inSettePiu.setDate(inSettePiu.getDate() + 7);

  // Conteggi per stato (dashboard widget)
  const contStati = await db
    .select({ stato: pratiche.stato, n: count() })
    .from(pratiche)
    .where(sql`${pratiche.stato} NOT IN ('chiusa', 'annullata')`)
    .groupBy(pratiche.stato);
  const stateMap: Record<string, number> = {};
  for (const c of contStati) stateMap[c.stato as string] = Number(c.n);

  // Interventi pianificati oggi
  const interventiOggi = await db
    .select({
      id: assegnazioniIntervento.id,
      tecnicoNome: tecnici.nome,
      tecnicoCog: tecnici.cognome,
      sedeNome: sedi.nome,
      orarioDa: assegnazioniIntervento.orarioDa,
      stato: assegnazioniIntervento.stato,
      praticaId: pratiche.id,
      praticaCodice: pratiche.codice,
      praticaAnno: pratiche.annoRiferimento,
      tipoLavoro: pratiche.tipoLavoro,
      cliente: clienti.ragioneSociale,
      barca: imbarcazioni.nome,
    })
    .from(assegnazioniIntervento)
    .leftJoin(pratiche, eq(pratiche.id, assegnazioniIntervento.praticaId))
    .leftJoin(tecnici, eq(tecnici.id, assegnazioniIntervento.tecnicoId))
    .leftJoin(sedi, eq(sedi.id, assegnazioniIntervento.sedeId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(eq(assegnazioniIntervento.data, today));

  // Prossimi 7 giorni
  const interventi7gg = await db
    .select({
      data: assegnazioniIntervento.data,
      n: count(),
    })
    .from(assegnazioniIntervento)
    .where(
      and(
        gte(assegnazioniIntervento.data, today),
        lte(assegnazioniIntervento.data, inSettePiu.toISOString().slice(0, 10))
      )
    )
    .groupBy(assegnazioniIntervento.data);

  // Pratiche modificate di recente
  const ultimeModificate = await db
    .select({
      id: pratiche.id,
      codice: pratiche.codice,
      anno: pratiche.annoRiferimento,
      stato: pratiche.stato,
      cliente: clienti.ragioneSociale,
      barca: imbarcazioni.nome,
      updatedAt: pratiche.updatedAt,
    })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(sql`${pratiche.stato} NOT IN ('chiusa', 'annullata')`)
    .orderBy(desc(pratiche.updatedAt))
    .limit(6);

  // Preventivi inviati senza risposta da > 7 giorni
  const settimanaFa = new Date();
  settimanaFa.setDate(settimanaFa.getDate() - 7);
  const preventiviInRitardo = await db
    .select({
      id: preventivi.id,
      codice: preventivi.codiceOfferta,
      praticaId: pratiche.id,
      pratCod: pratiche.codice,
      pratAnno: pratiche.annoRiferimento,
      cliente: clienti.ragioneSociale,
      barca: imbarcazioni.nome,
      dataInvio: preventivi.dataInvio,
      totale: preventivi.totaleNetto,
    })
    .from(preventivi)
    .leftJoin(pratiche, eq(pratiche.id, preventivi.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(
      and(
        isNull(preventivi.dataAccettazione),
        lt(preventivi.dataInvio, settimanaFa)
      )
    )
    .limit(5);

  // Fatture insolute
  const fattureInsolute = await db
    .select({
      id: fatture.id,
      numero: fatture.numero,
      anno: fatture.annoFiscale,
      cliente: clienti.ragioneSociale,
      pratCod: pratiche.codice,
      pratAnno: pratiche.annoRiferimento,
      totale: fatture.totale,
      data: fatture.dataEmissione,
    })
    .from(fatture)
    .leftJoin(pratiche, eq(pratiche.id, fatture.praticaId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .where(eq(fatture.stato, "insoluta"))
    .limit(5);

  // KPI conteggi
  const [tot] = await db
    .select({
      pratAttive: sql<number>`(SELECT count(*)::int FROM ${pratiche} WHERE stato NOT IN ('chiusa', 'annullata'))`,
      pratChiuseMese: sql<number>`(SELECT count(*)::int FROM ${pratiche} WHERE stato = 'chiusa' AND data_chiusura >= date_trunc('month', current_date))`,
      imb: sql<number>`(SELECT count(*)::int FROM ${imbarcazioni})`,
      fattInsolute: sql<number>`(SELECT count(*)::int FROM ${fatture} WHERE stato = 'insoluta')`,
    })
    .from(sql`(SELECT 1) AS dummy`);

  const ora = oraNow.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard operativa</h1>
          <p className="text-sm text-muted-foreground capitalize">{ora}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/pratiche/new">
              <Plus className="h-4 w-4" /> Nuova pratica
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/calendario?week=${today}`}>
              <CalendarCheck className="h-4 w-4" /> Vai al calendario
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Pratiche attive" value={tot.pratAttive} icon={ClipboardList} href="/pratiche" />
        <KPI
          label="Chiuse questo mese"
          value={tot.pratChiuseMese}
          icon={CalendarCheck}
          href="/pratiche?stato=chiusa"
        />
        <KPI label="Imbarcazioni gestite" value={tot.imb} icon={Ship} href="/imbarcazioni" />
        <KPI
          label="Fatture insolute"
          value={tot.fattInsolute}
          icon={ReceiptText}
          href="/fatture"
          alert={tot.fattInsolute > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Interventi oggi */}
        <section className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Interventi di oggi ({interventiOggi.length})
            </h2>
            <Link href={`/calendario?week=${today}`} className="text-sm text-primary hover:underline">
              Settimana →
            </Link>
          </div>
          <div className="divide-y">
            {interventiOggi.map((i) => (
              <Link
                key={i.id}
                href={`/pratiche/${i.praticaId}`}
                className="flex items-center gap-3 p-3 hover:bg-accent text-sm"
              >
                <div className="min-w-[60px] text-muted-foreground text-xs">
                  {i.orarioDa ?? "—:—"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {i.barca ?? "(senza barca)"}{" "}
                    <span className="text-muted-foreground font-normal">· {i.cliente}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {i.sedeNome} · {i.tipoLavoro ?? "—"} · 👤 {i.tecnicoNome} {i.tecnicoCog ?? ""}
                  </div>
                </div>
                <span className="text-xs rounded bg-secondary px-2 py-0.5">{i.stato}</span>
              </Link>
            ))}
            {interventiOggi.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nessun intervento pianificato per oggi.
              </div>
            )}
          </div>
        </section>

        {/* Pratiche da seguire */}
        <section className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pratiche per stato (escluse chiuse)
            </h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {STATI_AZIONE.map((s) => (
              <Link
                key={s.stato}
                href={s.href}
                className={`rounded-md ${s.color} px-3 py-2 hover:opacity-80 transition-opacity flex items-center justify-between`}
              >
                <span className="text-xs font-medium">{s.label}</span>
                <span className="font-semibold text-lg">{stateMap[s.stato] ?? 0}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preventivi in ritardo */}
        {preventiviInRitardo.length > 0 && (
          <section className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="font-semibold">Preventivi inviati &gt; 7 giorni, in attesa risposta</h2>
            </div>
            <div className="divide-y text-sm">
              {preventiviInRitardo.map((p) => (
                <Link
                  key={p.id}
                  href={`/preventivi/${p.id}`}
                  className="flex items-center justify-between p-3 hover:bg-accent"
                >
                  <span>
                    <span className="font-mono">{p.codice}</span> · {p.cliente} · {p.barca ?? "—"}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      Inviato {formatDate(p.dataInvio)}
                    </span>
                    <span className="font-medium">{formatEur(p.totale)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Fatture insolute */}
        {fattureInsolute.length > 0 && (
          <section className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h2 className="font-semibold">Fatture insolute</h2>
            </div>
            <div className="divide-y text-sm">
              {fattureInsolute.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3">
                  <span>
                    <span className="font-mono">{f.numero}/{f.anno}</span> · {f.cliente}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{formatDate(f.data)}</span>
                    <span className="font-medium">{formatEur(f.totale)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Ultimi aggiornamenti */}
      <section className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pratiche modificate di recente
          </h2>
          <Link href="/pratiche" className="text-sm text-primary hover:underline">
            Tutte le pratiche →
          </Link>
        </div>
        <div className="divide-y text-sm">
          {ultimeModificate.map((p) => (
            <Link
              key={p.id}
              href={`/pratiche/${p.id}`}
              className="flex items-center justify-between p-3 hover:bg-accent"
            >
              <span>
                <span className="font-mono">{p.codice}/{String(p.anno).slice(-2)}</span> ·{" "}
                {p.cliente} · {p.barca ?? "—"}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs rounded bg-secondary px-2 py-0.5">{p.stato}</span>
                <span className="text-muted-foreground text-xs">{formatDate(p.updatedAt)}</span>
              </span>
            </Link>
          ))}
          {ultimeModificate.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">Nessuna pratica.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  href,
  alert,
}: {
  label: string;
  value: number;
  icon: any;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-card p-4 hover:bg-accent transition-colors ${
        alert ? "border-rose-300" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${alert ? "text-rose-600" : "text-muted-foreground"}`} />
        <span className="text-3xl font-semibold">{value}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </Link>
  );
}
