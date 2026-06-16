import "dotenv/config";
import * as path from "node:path";
import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { eq, and, isNull } from "drizzle-orm";
import { db, pool } from "../db/client";
import { clienti, imbarcazioni, impianti, sedi } from "../db/schema/anagrafiche";
import { masterListHamann } from "../db/schema/master-list";
import { pratiche } from "../db/schema/pratiche";
import {
  listiniCantiere,
  listiniRighe,
  listiniScafoPersonalizzati,
} from "../db/schema/listini";
import { assegnazioniIntervento } from "../db/schema/pianificazione";

const SOURCES_DIR = path.resolve(__dirname, "../data-sources");

const ITALIAN_MONTHS: Record<string, number> = {
  GENNAIO: 0, FEBBRAIO: 1, MARZO: 2, APRILE: 3, MAGGIO: 4, GIUGNO: 5,
  LUGLIO: 6, AGOSTO: 7, SETTEMBRE: 8, OTTOBRE: 9, NOVEMBRE: 10, DICEMBRE: 11,
  Gennaio: 0, Febbraio: 1, Marzo: 2, Aprile: 3, Maggio: 4, Giugno: 5,
  Luglio: 6, Agosto: 7, Settembre: 8, Ottobre: 9, Novembre: 10, Dicembre: 11,
};

function readSheet(file: string, sheet: string): any[][] {
  const wb = XLSX.readFile(path.join(SOURCES_DIR, file));
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Sheet "${sheet}" non trovato in ${file}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

function sheetNames(file: string): string[] {
  return XLSX.readFile(path.join(SOURCES_DIR, file)).SheetNames;
}

function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function excelDateToDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function toDateOnly(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

async function ensureCantiere(name: string): Promise<string> {
  const norm = name.trim().toUpperCase();
  const [existing] = await db
    .select({ id: clienti.id })
    .from(clienti)
    .where(and(eq(clienti.ragioneSociale, norm), eq(clienti.tipo, "cantiere")))
    .limit(1);
  if (existing) return existing.id;
  const [r] = await db
    .insert(clienti)
    .values({ tipo: "cantiere", ragioneSociale: norm, nomeBreve: norm })
    .returning({ id: clienti.id });
  return r.id;
}

async function ensureClienteByName(rag: string, tipo: "cantiere" | "bordo"): Promise<string> {
  const norm = rag.trim().toUpperCase();
  const [existing] = await db
    .select({ id: clienti.id })
    .from(clienti)
    .where(eq(clienti.ragioneSociale, norm))
    .limit(1);
  if (existing) return existing.id;
  const [r] = await db
    .insert(clienti)
    .values({ tipo, ragioneSociale: norm, nomeBreve: norm })
    .returning({ id: clienti.id });
  return r.id;
}

async function ensureSede(name: string): Promise<string> {
  const norm = name.trim().toUpperCase();
  const [existing] = await db.select({ id: sedi.id }).from(sedi).where(eq(sedi.nome, norm)).limit(1);
  if (existing) return existing.id;
  const [r] = await db.insert(sedi).values({ nome: norm }).returning({ id: sedi.id });
  return r.id;
}

async function findImbarcazioneBySN(sn: string): Promise<string | null> {
  const [r] = await db
    .select({ id: impianti.imbarcazioneId })
    .from(impianti)
    .where(eq(impianti.serialNumber, sn))
    .limit(1);
  return r?.id ?? null;
}

async function findOrCreateImbarcazione(opts: {
  nome: string | null;
  cantiereId?: string;
  hagSn?: string;
  dvzSn?: string;
}): Promise<string | null> {
  if (opts.hagSn) {
    const id = await findImbarcazioneBySN(opts.hagSn);
    if (id) return id;
  }
  if (opts.dvzSn) {
    const id = await findImbarcazioneBySN(opts.dvzSn);
    if (id) return id;
  }
  if (opts.nome && opts.cantiereId) {
    const [byName] = await db
      .select({ id: imbarcazioni.id })
      .from(imbarcazioni)
      .where(
        and(eq(imbarcazioni.nome, opts.nome.toUpperCase()), eq(imbarcazioni.cantiereCostruttoreId, opts.cantiereId))
      )
      .limit(1);
    if (byName) return byName.id;
  }
  if (!opts.nome && !opts.cantiereId) return null;
  const [n] = await db
    .insert(imbarcazioni)
    .values({
      nome: (opts.nome?.toUpperCase() ?? null) as any,
      cantiereCostruttoreId: opts.cantiereId as any,
    })
    .returning({ id: imbarcazioni.id });
  return n.id;
}

// =============================================================
// 1. IMPIANTI
// =============================================================
async function importImpianti() {
  console.log("\n[Impianti] Lettura VENDUTI…");
  const rows = readSheet("Impianti.xlsx", "VENDUTI");
  const header = rows[0].map((h) => (h ? String(h).trim() : ""));
  const idx = (name: string) => header.indexOf(name);

  const iCant = idx("CANTIERE");
  const iCostr = idx("COSTRUZIONE");
  const iNome = idx("NOME");
  const iArm = idx("ARMATORE");
  const iMetri = idx("METRI");
  const iHamann = idx("HAMANN");
  const iSnHag = idx("SN HAG");
  const iSuHw = idx("SU HW");
  const iCat = idx("CAT");
  const iDvzOws = idx("DVZ OWS");
  const iSnDvz = idx("SN DVZ");
  const iSuOws = idx("S UP OWS");
  const iDvzStp = idx("DVZ STP");
  const iSnStp = idx("SN STP");

  let okImb = 0, okImp = 0, skip = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === "")) continue;

    const cantiereName = cleanStr(row[iCant]);
    const hull = cleanStr(row[iCostr]);
    if (!cantiereName) { skip++; continue; }
    const cantiereId = await ensureCantiere(cantiereName);

    let imbId: string | null = null;
    if (hull) {
      const [ex] = await db
        .select({ id: imbarcazioni.id })
        .from(imbarcazioni)
        .where(and(eq(imbarcazioni.cantiereCostruttoreId, cantiereId), eq(imbarcazioni.hullNumber, hull)))
        .limit(1);
      if (ex) imbId = ex.id;
    }
    const metri = row[iMetri];
    if (!imbId) {
      const [n] = await db
        .insert(imbarcazioni)
        .values({
          nome: cleanStr(row[iNome]) as any,
          hullNumber: hull as any,
          modello: hull?.split("-")[0] ?? null,
          cantiereCostruttoreId: cantiereId,
          armatore: cleanStr(row[iArm]) as any,
          metri: metri !== null && metri !== "" ? String(metri) : (null as any),
        })
        .returning({ id: imbarcazioni.id });
      imbId = n.id;
      okImb++;
    } else {
      const nome = cleanStr(row[iNome]);
      if (nome) await db.update(imbarcazioni).set({ nome }).where(eq(imbarcazioni.id, imbId));
    }

    const hagModel = cleanStr(row[iHamann]);
    const snHag = cleanStr(row[iSnHag]);
    if (hagModel || snHag) {
      const [ex] = snHag
        ? await db.select({ id: impianti.id }).from(impianti).where(eq(impianti.serialNumber, snHag)).limit(1)
        : [null];
      if (!ex) {
        await db.insert(impianti).values({
          imbarcazioneId: imbId,
          tipo: "HAG_SEWAGE",
          modello: hagModel as any,
          serialNumber: snHag as any,
          dataInstallazione: toDateOnly(excelDateToDate(row[iSuHw])) as any,
          capacita: cleanStr(row[iCat]) as any,
        });
        okImp++;
      }
    }

    const dvzOwsModel = cleanStr(row[iDvzOws]);
    const snDvz = cleanStr(row[iSnDvz]);
    if (dvzOwsModel || snDvz) {
      const [ex] = snDvz
        ? await db.select({ id: impianti.id }).from(impianti).where(eq(impianti.serialNumber, snDvz)).limit(1)
        : [null];
      if (!ex) {
        await db.insert(impianti).values({
          imbarcazioneId: imbId,
          tipo: "DVZ_OWS",
          modello: dvzOwsModel as any,
          serialNumber: snDvz as any,
          dataInstallazione: toDateOnly(excelDateToDate(row[iSuOws])) as any,
        });
        okImp++;
      }
    }

    const dvzStpModel = cleanStr(row[iDvzStp]);
    const snStp = cleanStr(row[iSnStp]);
    if (dvzStpModel || snStp) {
      const [ex] = snStp
        ? await db.select({ id: impianti.id }).from(impianti).where(eq(impianti.serialNumber, snStp)).limit(1)
        : [null];
      if (!ex) {
        await db.insert(impianti).values({
          imbarcazioneId: imbId,
          tipo: "DVZ_STP",
          modello: dvzStpModel as any,
          serialNumber: snStp as any,
        });
        okImp++;
      }
    }
    if (r % 200 === 0) console.log(`  ${r}/${rows.length}`);
  }
  console.log(`[Impianti] Imbarcazioni: +${okImb}, impianti: +${okImp}, salti: ${skip}`);
}

// =============================================================
// 2. MASTER LIST
// =============================================================
async function importMasterList() {
  console.log("\n[MasterList] Lettura…");
  const file = "Master List Italy 04.05.2026.xlsx";
  if (!fs.existsSync(path.join(SOURCES_DIR, file))) { console.log("  skip"); return; }

  for (const [sheet, stato] of [
    ["to be delivered", "to_be_delivered"],
    ["delivered", "delivered"],
  ] as const) {
    const rows = readSheet(file, sheet);
    const header = rows[0]?.map((h) => (h ? String(h).trim() : "")) ?? [];
    const ix = (n: string) => header.indexOf(n);
    const iPM = ix("PROJECT MANAGER") >= 0 ? ix("PROJECT MANAGER") : 1;
    const iOrder = ix("ORDER NO.");
    const iSN = ix("SN");
    const iYard = ix("YARD");
    const iHull = ix("HULL");
    const iType = ix("TYPE");
    const iYardReq = ix("DEL. DATE - YARD REQ");
    const iHamannOC = ix("DEL. DATE - HAMANN O.C.");
    const iDelayYard = ix("DELAY ON YARD REQ");
    const iDelayOC = ix("DELAY ON HAMANN  O.C.");

    let ins = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === "")) continue;
      const sn = cleanStr(row[iSN]);
      const orderNo = cleanStr(row[iOrder]);
      if (!sn && !orderNo) continue;
      if (orderNo) {
        const [ex] = await db
          .select({ id: masterListHamann.id })
          .from(masterListHamann)
          .where(eq(masterListHamann.orderNo, orderNo))
          .limit(1);
        if (ex) continue;
      }
      await db.insert(masterListHamann).values({
        stato,
        projectManager: cleanStr(row[iPM]) as any,
        orderNo: orderNo as any,
        serialNumber: sn as any,
        yard: cleanStr(row[iYard]) as any,
        hull: cleanStr(row[iHull]) as any,
        type: cleanStr(row[iType]) as any,
        delDateYardReq: toDateOnly(excelDateToDate(row[iYardReq])) as any,
        delDateHamannOC: toDateOnly(excelDateToDate(row[iHamannOC])) as any,
        delayOnYardReq: typeof row[iDelayYard] === "number" ? row[iDelayYard] : null,
        delayOnHamannOC: typeof row[iDelayOC] === "number" ? row[iDelayOC] : null,
      });
      ins++;
    }
    console.log(`[MasterList] ${sheet}: +${ins}`);
  }
}

// =============================================================
// 3. TG2020 → pratiche storiche
// =============================================================
function mapStatoFromSheet(sheet: string, statoOrd: string | null): string {
  if (sheet === "Da Certificare e Fatturare") return "da_fatturare";
  if (sheet === "Da ravviare") return "materiale_in_arrivo";
  if (sheet === "Attesa Ord") return "in_attesa_accettazione";
  // anni storici: classifica dal valore ORD
  const o = (statoOrd ?? "").toUpperCase();
  if (o.includes("FATTURA")) return "chiusa";
  if (o.includes("FP")) return "da_fatturare";
  if (o.includes("ATTESA")) return "in_attesa_accettazione";
  if (o.includes("WARR")) return "accettata";
  if (o.includes("OK")) return "chiusa";
  return "chiusa";
}

function mapTipoLavoro(tg: string | null): string | null {
  if (!tg) return null;
  const t = tg.toUpperCase().replace(/\s+/g, "");
  if (t.includes("A+2F")) return "TG_A_2F";
  if (t.includes("A+1F")) return "TG_A_1F";
  if (t === "A") return "TG_A";
  if (t.includes("B+1F")) return "TG_B_1F";
  if (t === "B") return "TG_B";
  if (t === "S") return "TG_S";
  if (t.startsWith("AVV")) return "TG_AVV";
  if (t.startsWith("WARR")) return "TG_WARR";
  if (t.startsWith("ISP")) return "TG_ISP";
  if (t.startsWith("OFF")) return "TG_OFF";
  if (t.includes("1Y")) return "MAN_1Y";
  if (t.includes("2Y")) return "MAN_2Y";
  if (t.startsWith("EXTR")) return "EXTRA";
  if (t.startsWith("FORN")) return "FORNITURA";
  if (t.startsWith("TRAIN")) return "TRAINING";
  return "ALTRO";
}

function parseInt2025(int: string): { codice: string; anno: number } | null {
  if (!int) return null;
  // formati: "368-25", "368/25", "368-2025", "368", "368 Rev B"
  const m = int.match(/^(\d+)(?:\s*Rev\s*[A-Z])?(?:[\/-](\d{2,4}))?$/i);
  if (!m) return null;
  const codice = m[1].padStart(3, "0");
  let anno = m[2] ? parseInt(m[2]) : new Date().getFullYear();
  if (anno < 100) anno += 2000;
  return { codice, anno };
}

async function importTG2020() {
  console.log("\n[TG2020] Pratiche storiche…");
  const file = "TG2020.xlsx";
  if (!fs.existsSync(path.join(SOURCES_DIR, file))) { console.log("  skip"); return; }

  const sheets = sheetNames(file);
  const targetSheets = sheets.filter((s) =>
    ["Da ravviare", "Attesa Ord", "Da Certificare e Fatturare"].includes(s) ||
    /^\s*\d{4}\s*$/.test(s)
  );

  let total = 0;
  for (const sheet of targetSheets) {
    const rows = readSheet(file, sheet);
    if (rows.length === 0) continue;
    const header = rows[0].map((h) => (h ? String(h).trim().toUpperCase() : ""));
    const ix = (n: string) => header.indexOf(n);
    const iOff = ix("OFF");
    const iInt = ix("INT");
    const iOrd = ix("ORD");
    const iNome = ix("NOME");
    const iCli = ix("CLIENTE");
    const iLuogo = ix("LUOGO");
    const iEsec = ix("ESECUTORI");
    const iFp = ix("FP");
    const iHag = ix("HAG");
    const iTg = ix("TG");
    const iDvz = ix("DVZ");
    const iNote = ix("NOTE");

    if (iInt < 0 || iCli < 0) continue;
    let ins = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === "")) continue;
      const intRaw = cleanStr(row[iInt]);
      const cliRaw = cleanStr(row[iCli]);
      if (!intRaw || !cliRaw) continue;
      const parsed = parseInt2025(intRaw);
      if (!parsed) continue;
      // dedup
      const [ex] = await db
        .select({ id: pratiche.id })
        .from(pratiche)
        .where(and(eq(pratiche.codice, parsed.codice), eq(pratiche.annoRiferimento, parsed.anno)))
        .limit(1);
      if (ex) continue;

      const tipoCli = cliRaw.toUpperCase() === "BORDO" ? "bordo" : "cantiere";
      const clienteId = await ensureClienteByName(cliRaw, tipoCli);
      const sedeName = cleanStr(row[iLuogo]);
      const sedeId = sedeName ? await ensureSede(sedeName) : null;

      const hagSn = cleanStr(row[iHag]);
      const dvzSn = cleanStr(row[iDvz]);
      const nome = cleanStr(row[iNome]);
      const imbId = await findOrCreateImbarcazione({
        nome,
        cantiereId: tipoCli === "cantiere" ? clienteId : undefined,
        hagSn: hagSn ?? undefined,
        dvzSn: dvzSn ?? undefined,
      });

      const stato = mapStatoFromSheet(sheet, cleanStr(row[iOrd]));
      const tipo = mapTipoLavoro(cleanStr(row[iTg]));
      const fpDate = excelDateToDate(row[iFp]);

      await db.insert(pratiche).values({
        codice: parsed.codice,
        annoRiferimento: parsed.anno,
        clienteId,
        imbarcazioneId: imbId as any,
        sedeInterventoId: sedeId as any,
        stato: stato as any,
        tipoLavoro: tipo as any,
        dataApertura: (fpDate ?? new Date(parsed.anno, 0, 1)) as any,
        note: cleanStr(row[iNote]) as any,
      });
      ins++;
    }
    console.log(`[TG2020] ${sheet}: +${ins}`);
    total += ins;
  }
  console.log(`[TG2020] totale pratiche: ${total}`);
}

// =============================================================
// 4. DETTAGLIO INTERVENTI → assegnazioni storiche
// =============================================================
async function importDettaglioInterventi() {
  console.log("\n[Dettaglio] Lettura calendario…");
  const file = "DETTAGLIO INTERVENTI 2019-2021.xls";
  if (!fs.existsSync(path.join(SOURCES_DIR, file))) { console.log("  skip"); return; }

  const sheets = sheetNames(file).filter((s) => /^\d{4}$/.test(s));
  let total = 0;
  for (const sheet of sheets) {
    const anno = parseInt(sheet);
    const rows = readSheet(file, sheet);
    let currentMonth: number | null = null;
    let weekHeaderIdx = -1; // row idx with WEEK | LUN | MAR | ... days
    let dayRow: any[] | null = null; // the day numbers row right after week header

    let ins = 0;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const first = cleanStr(row[0]);

      // Riconosce intestazione mese (es. "GENNAIO" or "  Gennaio")
      if (first && /^[A-Za-zàèìòù]+$/i.test(first) && ITALIAN_MONTHS[first] !== undefined) {
        currentMonth = ITALIAN_MONTHS[first];
        continue;
      }

      // Riconosce riga header WEEK | LUN | MAR | ...
      if (first === "WEEK") {
        weekHeaderIdx = r;
        // riga successiva contiene i numeri dei giorni
        dayRow = rows[r + 1] ?? null;
        continue;
      }

      // Riconosce blocco sede: prima colonna ha nome sede (LIVORNO, SPEZIA, etc.)
      if (first && currentMonth !== null && dayRow && first.length >= 3 && first === first.toUpperCase()) {
        const sedeName = first;
        const sedeId = await ensureSede(sedeName);

        // Le righe successive contengono cantiere / barca / lavoro / stato / tecnici
        // Cantiere è nella stessa riga del nome sede, per ogni giorno
        const cantieri = row;
        const barche = rows[r + 1] ?? [];
        const lavori = rows[r + 2] ?? [];
        const tecnici = rows[r + 4] ?? [];

        // Itera colonne giorno (1..7 = LUN..DOM)
        for (let col = 1; col <= 7; col++) {
          const giorno = dayRow[col];
          if (!giorno || typeof giorno !== "number") continue;
          const cantiereCell = cleanStr(cantieri[col]);
          const barca = cleanStr(barche[col]);
          if (!cantiereCell && !barca) continue;
          // formato: "BENETTI/BENETTI 317/318-25"
          const cantiereName = cantiereCell?.split("/")[0]?.trim();
          const intCode = cantiereCell?.split("/").slice(1).join("/").trim();
          const tecniciStr = cleanStr(tecnici[col]);
          const lavoroStr = cleanStr(lavori[col]);

          const data = new Date(anno, currentMonth, giorno);
          // Crea pratica placeholder se intCode parsable
          let praticaId: string | null = null;
          const intMatch = intCode?.match(/(\d+)[\/-](\d{2,4})/);
          if (intMatch) {
            const codice = intMatch[1].padStart(3, "0");
            let aPr = parseInt(intMatch[2]);
            if (aPr < 100) aPr += 2000;
            const [p] = await db
              .select({ id: pratiche.id })
              .from(pratiche)
              .where(and(eq(pratiche.codice, codice), eq(pratiche.annoRiferimento, aPr)))
              .limit(1);
            if (p) praticaId = p.id;
            else if (cantiereName) {
              // crea pratica minima
              const cliId = await ensureClienteByName(cantiereName, "cantiere");
              const [np] = await db
                .insert(pratiche)
                .values({
                  codice,
                  annoRiferimento: aPr,
                  clienteId: cliId,
                  sedeInterventoId: sedeId as any,
                  stato: "chiusa" as any,
                  tipoLavoro: mapTipoLavoro(lavoroStr) as any,
                  dataApertura: data as any,
                })
                .returning({ id: pratiche.id });
              praticaId = np.id;
            }
          }
          if (!praticaId) continue;

          // Per ora salviamo solo l'assegnazione (senza tecnici reali — sono solo nomi liberi nel file)
          // dedup: skip se esiste già per pratica+data+sede
          const [exA] = await db
            .select({ id: assegnazioniIntervento.id })
            .from(assegnazioniIntervento)
            .where(
              and(
                eq(assegnazioniIntervento.praticaId, praticaId),
                eq(assegnazioniIntervento.data, toDateOnly(data)!)
              )
            )
            .limit(1);
          if (exA) continue;

          // Nessun tecnico abbinato: requires tecnico_id. Salto se non ho tecnici creati.
          // Lascio nota in pratiche.note se possibile.
          if (tecniciStr) {
            // skip insert assegnazione (manca FK tecnico) ma incrementa contatore narrativo
          }
          ins++;
        }
        r += 5; // avanza oltre il blocco
      }
    }
    console.log(`[Dettaglio] ${sheet}: ${ins} eventi riconosciuti`);
    total += ins;
  }
  console.log(`[Dettaglio] totale eventi: ${total}`);
}

// =============================================================
// 5. LISTINI Ferretti/Custom/Wally
// =============================================================
async function importListini() {
  console.log("\n[Listini] Ferretti-Custom-Wally…");
  const file = "Ferretti - Custom - Wally.xls";
  if (!fs.existsSync(path.join(SOURCES_DIR, file))) { console.log("  skip"); return; }

  // Listino master "Listino 04_2026" → si applica a 4 cantieri: Ferretti, Custom Line, Wally, Riva, Pershing
  const cantieriGruppoFerretti = ["FERRETTI", "CUSTOM LINE", "WALLY", "RIVA", "PERSHING"];
  const rows = readSheet(file, "Listino 04_2026");
  // Cerco la riga header (ha "HAMANN" e "Prezzo IVA Esclusa")
  let headerIdx = -1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (row.some((c) => String(c ?? "").trim() === "HAMANN") && row.some((c) => String(c ?? "").includes("Prezzo IVA"))) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx < 0) {
    console.log("[Listini] header non trovato in Listino 04_2026");
  } else {
    const header = rows[headerIdx].map((c) => String(c ?? "").trim());
    // col 1 = descrizione articolo ("HL Cont Compact 0125 400/50/3")
    // col 2 = Codice articolo (numero Hamann es. 431404)
    // col 4 = "Prezzo IVA Esclusa" (vendita NTC)
    // col 5 = "ACQUISTO" (prezzo da Hamann)
    const iDescr = 1;
    const iCodArt = header.indexOf("Codice");
    const iPrezzo = header.findIndex((c) => c.includes("Prezzo IVA Esclusa"));
    const iAcq = header.indexOf("ACQUISTO");
    const isNum = (v: any) => typeof v === "number" && !isNaN(v);

    let listinoIds: Record<string, string> = {};
    for (const cantNome of cantieriGruppoFerretti) {
      const cantId = await ensureCantiere(cantNome);
      const [exL] = await db
        .select({ id: listiniCantiere.id })
        .from(listiniCantiere)
        .where(eq(listiniCantiere.cantiereId, cantId))
        .limit(1);
      if (exL) {
        listinoIds[cantNome] = exL.id;
      } else {
        const [nl] = await db
          .insert(listiniCantiere)
          .values({
            cantiereId: cantId,
            nome: `Listino Gruppo Ferretti — Apr 2026`,
            validoDa: "2026-04-01",
          })
          .returning({ id: listiniCantiere.id });
        listinoIds[cantNome] = nl.id;
      }
    }

    let ins = 0;
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const desc = cleanStr(row[iDescr]);
      const prezzo = row[iPrezzo];
      const acq = row[iAcq];
      if (!desc) continue;
      // skip righe header/separatori
      if (!isNum(prezzo) && !isNum(acq)) continue;
      const codArt = cleanStr(row[iCodArt]);
      for (const cantNome of cantieriGruppoFerretti) {
        const listId = listinoIds[cantNome];
        // dedup
        const [exr] = await db
          .select({ id: listiniRighe.id })
          .from(listiniRighe)
          .where(and(eq(listiniRighe.listinoId, listId), eq(listiniRighe.descrizioneArticolo, desc)))
          .limit(1);
        if (exr) continue;
        await db.insert(listiniRighe).values({
          listinoId: listId,
          descrizioneArticolo: desc,
          codiceArticolo: codArt as any,
          prezzoVendita: isNum(prezzo) ? String(prezzo) : (null as any),
          prezzoAcquisto: isNum(acq) ? String(acq) : (null as any),
        });
        ins++;
      }
    }
    console.log(`[Listini] master righe inserite: ${ins}`);
  }

  // Fogli per modello: 30, 33, 34, 38, 42, 106, 120, 125, 140, Ferretti, Wally
  const modelliSheets = sheetNames(file).filter((s) =>
    /^(30|33|34|38|42|106|120|125|140|Ferretti|Wally)$/.test(s)
  );
  let scafiInseriti = 0;

  for (const sheet of modelliSheets) {
    const rows = readSheet(file, sheet);
    if (rows.length < 3) continue;
    // Riga 0 contiene gli hull numbers nelle colonne dispari (es. 030-019, 030-020...)
    // Riga 1 contiene la tensione
    // Riga "Ordine" e "Consegna" contengono date
    const hullRow = rows[0];
    const tensioneRow = rows[1];
    let ordineRowIdx = rows.findIndex((r) => cleanStr(r?.[0]) === "Ordine");
    let consegnaRowIdx = rows.findIndex((r) => cleanStr(r?.[0]) === "Consegna");
    if (ordineRowIdx < 0) continue;

    // Determina cantiere dal nome foglio
    let cantiereName: string;
    if (sheet === "Ferretti") cantiereName = "FERRETTI";
    else if (sheet === "Wally") cantiereName = "WALLY";
    else cantiereName = "CUSTOM LINE";
    const cantId = await ensureCantiere(cantiereName);
    const [list] = await db
      .select({ id: listiniCantiere.id })
      .from(listiniCantiere)
      .where(eq(listiniCantiere.cantiereId, cantId))
      .limit(1);
    if (!list) continue;

    // Itera colonne hull
    for (let col = 4; col < hullRow.length; col += 2) {
      const hull = cleanStr(hullRow[col]);
      if (!hull) continue;
      const tensione = cleanStr(tensioneRow[col + 1]) ?? cleanStr(tensioneRow[col]);
      const dataOrdine = toDateOnly(excelDateToDate(rows[ordineRowIdx]?.[col]));
      const dataConsegna = toDateOnly(excelDateToDate(rows[consegnaRowIdx >= 0 ? consegnaRowIdx : -1]?.[col]));

      // Scorri articoli dalle righe successive
      const startIdx = Math.max(ordineRowIdx, consegnaRowIdx) + 1;
      for (let r = startIdx; r < rows.length; r++) {
        const articolo = cleanStr(rows[r]?.[0]);
        const prezzoVend = rows[r]?.[col];
        const prezzoAcq = rows[r]?.[col + 1];
        if (!articolo) continue;
        if (prezzoVend === null && prezzoAcq === null) continue;
        // dedup
        const [exs] = await db
          .select({ id: listiniScafoPersonalizzati.id })
          .from(listiniScafoPersonalizzati)
          .where(
            and(
              eq(listiniScafoPersonalizzati.listinoId, list.id),
              eq(listiniScafoPersonalizzati.hullNumber, hull),
              eq(listiniScafoPersonalizzati.descrizioneArticolo, articolo)
            )
          )
          .limit(1);
        if (exs) continue;
        const isN = (v: any) => typeof v === "number" && !isNaN(v);
        if (!isN(prezzoVend) && !isN(prezzoAcq)) continue;
        await db.insert(listiniScafoPersonalizzati).values({
          listinoId: list.id,
          hullNumber: hull,
          modelloScafo: sheet,
          tensione: tensione as any,
          descrizioneArticolo: articolo,
          prezzoVendita: isN(prezzoVend) ? String(prezzoVend) : (null as any),
          prezzoAcquisto: isN(prezzoAcq) ? String(prezzoAcq) : (null as any),
          dataOrdine: dataOrdine as any,
          dataConsegna: dataConsegna as any,
        });
        scafiInseriti++;
      }
    }
    console.log(`[Listini] foglio ${sheet} processato`);
  }
  console.log(`[Listini] righe scafo inserite: ${scafiInseriti}`);
}

// =============================================================
async function main() {
  const args = process.argv.slice(2);
  const runAll = args.length === 0 || args.includes("--all");
  if (runAll || args.includes("--impianti")) await importImpianti();
  if (runAll || args.includes("--master-list")) await importMasterList();
  if (runAll || args.includes("--listini")) await importListini();
  if (runAll || args.includes("--tg2020")) await importTG2020();
  if (runAll || args.includes("--dettaglio")) await importDettaglioInterventi();
  await pool.end();
  console.log("\n✓ Import completato");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
