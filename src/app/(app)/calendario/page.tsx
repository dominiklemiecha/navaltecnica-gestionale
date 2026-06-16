import Link from "next/link";
import { db } from "@db/client";
import { assegnazioniIntervento } from "@db/schema/pianificazione";
import { pratiche } from "@db/schema/pratiche";
import { sedi, tecnici, clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { and, between, eq, asc } from "drizzle-orm";
import { startOfWeek, addDays, isoWeek, fmtDateInput, GIORNI } from "@/modules/calendario/service";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; sede?: string }>;
}) {
  const sp = await searchParams;
  const refDate = sp.week ? new Date(sp.week) : new Date();
  const monday = startOfWeek(refDate);
  const sunday = addDays(monday, 6);
  const sedeFilter = sp.sede;

  const sediList = await db.select().from(sedi).orderBy(asc(sedi.nome));

  const conditions = [
    between(assegnazioniIntervento.data, fmtDateInput(monday), fmtDateInput(sunday)),
  ];
  if (sedeFilter) conditions.push(eq(assegnazioniIntervento.sedeId, sedeFilter));

  const eventi = await db
    .select({
      id: assegnazioniIntervento.id,
      data: assegnazioniIntervento.data,
      stato: assegnazioniIntervento.stato,
      praticaId: pratiche.id,
      praticaCodice: pratiche.codice,
      praticaAnno: pratiche.annoRiferimento,
      tipoLavoro: pratiche.tipoLavoro,
      sedeNome: sedi.nome,
      sedeId: sedi.id,
      tecnicoNome: tecnici.nome,
      tecnicoCognome: tecnici.cognome,
      cliente: clienti.ragioneSociale,
      imb: imbarcazioni.nome,
      hull: imbarcazioni.hullNumber,
    })
    .from(assegnazioniIntervento)
    .leftJoin(pratiche, eq(pratiche.id, assegnazioniIntervento.praticaId))
    .leftJoin(sedi, eq(sedi.id, assegnazioniIntervento.sedeId))
    .leftJoin(tecnici, eq(tecnici.id, assegnazioniIntervento.tecnicoId))
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(and(...conditions));

  // Raggruppa per (sede, giorno)
  const grid: Record<string, Record<string, typeof eventi>> = {};
  for (let i = 0; i < 7; i++) {
    const d = fmtDateInput(addDays(monday, i));
    grid[d] = {};
  }
  for (const ev of eventi) {
    const dKey = String(ev.data);
    const sKey = ev.sedeNome ?? "(senza sede)";
    if (!grid[dKey]) grid[dKey] = {};
    if (!grid[dKey][sKey]) grid[dKey][sKey] = [];
    grid[dKey][sKey].push(ev);
  }

  // Sedi attive nella settimana (per righe)
  const sediAttive = new Set<string>();
  for (const d of Object.values(grid)) for (const s of Object.keys(d)) sediAttive.add(s);
  const sediOrd = Array.from(sediAttive).sort();

  const prevWeek = fmtDateInput(addDays(monday, -7));
  const nextWeek = fmtDateInput(addDays(monday, 7));
  const thisWeek = fmtDateInput(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">
          Calendario · Sett. {isoWeek(monday)} / {monday.getFullYear()}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendario?week=${prevWeek}${sedeFilter ? `&sede=${sedeFilter}` : ""}`}
            className="rounded border px-3 py-1 text-sm hover:bg-accent"
          >
            ← Settimana
          </Link>
          <Link
            href={`/calendario?week=${thisWeek}${sedeFilter ? `&sede=${sedeFilter}` : ""}`}
            className="rounded border px-3 py-1 text-sm hover:bg-accent"
          >
            Oggi
          </Link>
          <Link
            href={`/calendario?week=${nextWeek}${sedeFilter ? `&sede=${sedeFilter}` : ""}`}
            className="rounded border px-3 py-1 text-sm hover:bg-accent"
          >
            Settimana →
          </Link>
          <form className="flex gap-1">
            <input type="hidden" name="week" value={fmtDateInput(monday)} />
            <select
              name="sede"
              defaultValue={sedeFilter ?? ""}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Tutte le sedi</option>
              {sediList.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-md border px-2 text-sm hover:bg-accent">↻</button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/50 px-2 py-2 text-left w-32">Sede</th>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = addDays(monday, i);
                const isToday = fmtDateInput(d) === thisWeek;
                return (
                  <th key={i} className={`px-2 py-2 text-left ${isToday ? "bg-primary/10" : ""}`}>
                    <div className="font-medium">{GIORNI[i]}</div>
                    <div className="text-muted-foreground">{d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sediOrd.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Nessun intervento pianificato in questa settimana.
                </td>
              </tr>
            )}
            {sediOrd.map((sNome) => (
              <tr key={sNome} className="border-t align-top">
                <td className="sticky left-0 bg-card px-2 py-2 font-medium border-r">{sNome}</td>
                {Array.from({ length: 7 }).map((_, i) => {
                  const dKey = fmtDateInput(addDays(monday, i));
                  const cells = grid[dKey]?.[sNome] ?? [];
                  return (
                    <td key={i} className="px-1 py-1 border-r min-w-[120px]">
                      <div className="space-y-1">
                        {cells.map((ev) => (
                          <Link
                            key={ev.id}
                            href={`/pratiche/${ev.praticaId}`}
                            className={`block rounded p-1.5 hover:opacity-80 ${statoBg(ev.stato)}`}
                          >
                            <div className="font-medium truncate">
                              {ev.imb ?? ev.hull ?? "(sconosciuta)"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {ev.cliente} · {ev.tipoLavoro ?? ""}
                            </div>
                            {(ev.tecnicoNome || ev.tecnicoCognome) && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                👤 {ev.tecnicoNome} {ev.tecnicoCognome ?? ""}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Per assegnare un intervento apri una{" "}
        <Link href="/pratiche" className="underline hover:text-foreground">
          pratica
        </Link>{" "}
        e usa la sezione &ldquo;Pianificazione interventi&rdquo;.
      </p>
    </div>
  );
}

function statoBg(s: string | null): string {
  switch (s) {
    case "confermato":
      return "bg-blue-50 border border-blue-200";
    case "in_corso":
      return "bg-amber-50 border border-amber-200";
    case "completato":
      return "bg-green-50 border border-green-200";
    case "annullato":
      return "bg-rose-50 border border-rose-200 line-through";
    default:
      return "bg-slate-50 border border-slate-200";
  }
}
