# Gestionale Navaltecnica — Design

**Data:** 2026-05-19
**Stato:** In sviluppo iterativo
**Owner:** Dominik Lemiecha

## 1. Contesto

Navaltecnica (NTC) è centro service/installazione per impianti di trattamento acque su yacht di lusso (HAMANN sewage, DVZ oily water/grease traps, MATRIX filtration, AP MARINE, BIO SEA, SKF). Operazione attualmente gestita con un mosaico di file Excel/Word:

- `Impianti.xlsx` — anagrafica impianti installati (~2400 imbarcazioni, SN HAG/DVZ, anno, cantiere costruttore)
- `Master List Italy.xlsx` — ordini Hamann verso NTC (delivered / to be delivered)
- `TG2020.xlsx` — pipeline interventi per anno; fogli "Da ravviare", "Attesa Ord", "Da Certificare e Fatturare"
- `DETTAGLIO INTERVENTI.xls` — calendario settimanale per sede operativa
- `Ferretti-Custom-Wally.xls` — listino prezzi per cantiere, riga per scafo
- Template Word/Excel per preventivi
- PDF `Flusso di lavoro Service` — 10 step operativi

Il gestionale sostituisce questi file con un'unica applicazione web (+ mobile per i report di campo), preservando il flusso esistente.

## 2. Flusso operativo (dal PDF, autoritativo)

1. **Ricezione richiesta** da Bordo o Cantiere → raccolta dati imbarcazione, matricole, problema, luogo, tempistiche
2. **Verifica archivio + preparazione offerta** → ricambi + ore manodopera + trasferta + officina → invio preventivo
3. **Accettazione**: preventivo firmato (Bordo) o PO (Cantiere)
4. **Apertura pratica** sul gestionale: cliente, imbarcazione, offerta firmata archiviata, impianti coinvolti, tecnici, contatti
5. **Amministrazione iniziale**: Bordo = proforma + pagamento anticipato; Cantiere = PO + termini contrattuali
6. **Pagamento + ordine ricambi**: verifica pagamento (Bordo), ordini fornitori o prelievo stock con DDT
7. **Pianificazione**: tempi consegna materiale + disponibilità tecnici + operatività imbarcazione
8. **Esecuzione**: intervento a bordo/officina + report via APP Mobile (attività, materiali, anomalie → EXTRA = nuovo preventivo, stesso iter)
9. **Chiusura tecnica**: invio report + certificati al cliente
10. **Fatturazione finale**: Cantiere = SAL + fattura; Bordo = verifica + chiusura + archiviazione storico

## 3. Stack tecnologico

| Layer | Scelta | Motivazione |
|---|---|---|
| DB | PostgreSQL 16 | Storico, transazioni, full-text search nativo |
| Backend/Frontend | Next.js 16 (App Router) + TypeScript | Stack richiesto, full-stack in singolo deploy |
| ORM | Drizzle ORM | SQL-first, type-safe, leggero, migration esplicite |
| UI | shadcn/ui + Tailwind + Radix | Componenti production-ready, customizzabili |
| Auth | Auth.js (NextAuth v5) credentials + RBAC | Semplice, on-prem friendly |
| File storage | Volume locale `/uploads` dietro interfaccia astratta | Compatibile con Dokploy; swap futuro a S3/MinIO |
| PDF/Word gen | `docx`, `puppeteer` (HTML→PDF) | Riproduce template Word/Excel esistenti |
| Excel import | `xlsx` (SheetJS) | Import iniziale da file storici |
| Mobile field-report | PWA responsive (no native) | Time-to-market; tecnici usano browser mobile |
| Container | Docker + docker-compose | Dev locale → Dokploy in prod |
| Deploy | Dokploy (self-hosted) | Richiesto dall'owner |

## 4. Architettura

```
┌──────────────────────────────────────────────────┐
│ Next.js App (App Router)                         │
│ ┌──────────────┬──────────────┬───────────────┐  │
│ │ Web UI       │ Mobile PWA   │ API Routes    │  │
│ │ (back-office)│ (tecnici)    │ (REST + SSE)  │  │
│ └──────┬───────┴──────┬───────┴───────┬───────┘  │
│        └──────────────┴───────────────┘          │
│                    │                             │
│  ┌─────────────────▼──────────────────┐          │
│  │ Domain services (TypeScript)       │          │
│  │ - PraticheService  - ListinoService│          │
│  │ - PreventivoService - StockService │          │
│  │ - PianificazioneService            │          │
│  │ - FatturazioneService              │          │
│  └─────────────────┬──────────────────┘          │
│                    │                             │
│  ┌─────────────────▼──────────────────┐          │
│  │ Drizzle ORM                        │          │
│  └─────────────────┬──────────────────┘          │
└────────────────────┼─────────────────────────────┘
                     │
              ┌──────▼──────┐    ┌──────────────┐
              │ PostgreSQL  │    │ Volume       │
              │ 16          │    │ /uploads     │
              └─────────────┘    └──────────────┘
```

**Separazione moduli** (cartelle `src/modules/*`):

- `anagrafiche` — clienti, imbarcazioni, impianti, tecnici, sedi, fornitori
- `pratiche` — pratica = aggregato (rif. preventivo, PO, intervento, fattura)
- `preventivi` — offerte, versioni, generazione PDF/Word, firma
- `listini` — listini per cantiere, righe per scafo+modello
- `ordini` — PO in entrata (da clienti), ordini ricambi a fornitori
- `magazzino` — stock, movimenti, DDT
- `pianificazione` — calendario tecnici, assegnazioni
- `field-report` — report mobile (attività, materiali, foto, firma, EXTRA)
- `fatturazione` — proforma, SAL, finale, certificati
- `documenti` — archivio centrale (preventivi firmati, PO, report, certificati)

Ogni modulo espone: schema Drizzle, service layer, route handlers, componenti UI. Comunicazione tra moduli SOLO via service layer, mai accesso diretto a tabelle altrui.

## 5. Modello dati (entità principali)

### Anagrafiche

- **cliente** — tipo (`cantiere` | `bordo`), ragione sociale, P.IVA/CF, indirizzo, contatti, termini pagamento default, listino assegnato (per cantiere)
- **referente_cliente** — N persone per cliente (nome, ruolo, email, telefono)
- **imbarcazione** — nome, hull number (es. `030-019`), cantiere costruttore (FK cliente di tipo cantiere), modello (es. `52m`, `038`, `120`), metri, armatore, anno, proprietario attuale (FK cliente)
- **impianto** — `imbarcazione_id`, tipo (`HAG_SEWAGE` | `DVZ_OWS` | `DVZ_STP` | `MATRIX` | `AP_MARINE` | `BIO_SEA` | `SKF` | `ALTRO`), modello (`HL CONT COMPACT 0125`, `0125 PLUS`, `LF`, `NF`, `SM`, `SMP`, `SLIM02`, `MC`, `5MQ`), tensione (`400/50/3`, `230/50/1`, `240/60/1`), serial number, data installazione, capacità (es. `150 FSU`, `500 VC`)
- **tecnico** — nome, ruolo (`tecnico` | `responsabile_linea` | `officina`), sede principale, contatti, costo orario
- **sede** — sedi operative NTC (Livorno, Spezia, Viareggio, Genova, Ancona, …) usate per il calendario
- **fornitore** — nome, P.IVA, contatti, listini, tempi consegna medi

### Pratiche & Preventivi

- **pratica** — codice (formato `NNN-YY` come da TG2020), cliente, imbarcazione, sede intervento, stato (`richiesta` | `offerta` | `in_attesa_accettazione` | `accettata` | `in_attesa_pagamento` | `materiale_in_arrivo` | `pianificata` | `in_esecuzione` | `chiusura_tecnica` | `da_fatturare` | `chiusa` | `annullata`), tecnici assegnati (M:N), tipo lavoro (`TG_A` | `TG_B` | `TG_S` | `TG_AVV` | `TG_WARR` | `TG_ISP` | `TG_OFF` | `MAN_1Y` | `MAN_2Y` | `EXTRA`), pratica_padre (per EXTRA), data apertura, data chiusura, note
- **preventivo** — `pratica_id`, codice offerta (es. `289 Rev B`), versione, righe (ricambi, manodopera, trasferta, officina), totale, sconto, file generato (PDF/DOCX), file firmato, data invio, data accettazione, modalità accettazione (`firma` | `PO`), riferimento PO
- **preventivo_riga** — `preventivo_id`, tipo (`ricambio` | `manodopera` | `trasferta` | `officina`), descrizione, qty, prezzo_unitario, sconto, codice articolo (FK opzionale), impianto coinvolto (FK opzionale)

### Listini

- **listino_cantiere** — cantiere, validità (`valido_da`, `valido_a`), nome listino (es. "Listino Gruppo Ferretti — Aprile 2026"), file storico opzionale
- **listino_riga** — `listino_id`, modello scafo (es. `30`, `038`, `106`), articolo, prezzo_acquisto, prezzo_vendita, margine_calcolato, sconto applicato, note
- **listino_scafo_personalizzato** — overrides per singolo scafo (`030-019`), prezzo specifico, data ordine, data consegna

### Ordini & Magazzino

- **ordine_cliente** (PO ricevuto) — `pratica_id`, numero PO cliente, file PDF, data, importo, condizioni pagamento
- **ordine_fornitore** — `pratica_id`, fornitore, righe, data ordine, data consegna prevista/effettiva, file PDF, stato
- **articolo** — codice (es. `431404`), descrizione, fornitore default, unità di misura, prezzo_acquisto_corrente
- **stock_movimento** — articolo, qty, tipo (`carico` | `scarico` | `rettifica`), pratica_id opzionale, ddt_id opzionale, data, magazzino
- **ddt** — numero, data, mittente, destinatario (può essere imbarcazione/cantiere), righe articoli, file PDF

### Pianificazione

- **assegnazione_intervento** — `pratica_id`, tecnico_id, sede, data, orario_da, orario_a, note, stato (`pianificato` | `confermato` | `in_corso` | `completato` | `annullato`)
- Vista calendario aggregata su questa tabella, replica del file DETTAGLIO INTERVENTI

### Field Report (mobile)

- **report_intervento** — `pratica_id`, tecnico_compilatore, data, ora_inizio, ora_fine, ore_lavorate, descrizione_attività, anomalie, firma_cliente (base64/blob), firma_tecnico, foto (blob references), stato (`bozza` | `inviato` | `validato`), genera_extra_pratica_id (se anomalie → nuova pratica)
- **report_materiale_usato** — `report_id`, articolo, qty, da_stock (bool), note

### Fatturazione

- **fattura** — `pratica_id`, tipo (`proforma` | `SAL` | `finale`), numero, data, importo_netto, IVA, totale, stato (`emessa` | `inviata` | `pagata` | `insoluta`), file PDF, riferimento SDI (placeholder per integrazione futura)
- **pagamento** — `fattura_id`, data, importo, modalità, riferimento

### Documenti

- **documento** — entità polimorfica (`pratica_id` o `preventivo_id` o `ordine_id`, `tipo`, file_path, mime, sha256, uploaded_by, uploaded_at, descrizione). Tipi: `preventivo_firmato`, `PO`, `report`, `certificato`, `ddt`, `fattura`, `foto_intervento`, `altro`.

### Cross-cutting

- **utente** — email, password_hash, ruolo (`admin` | `amministrazione` | `tecnico_ufficio` | `tecnico_campo` | `responsabile_linea` | `solo_lettura`), tecnico_id (FK opzionale per legare utente a anagrafica tecnico)
- **audit_log** — tabella, record_id, azione, utente, timestamp, diff JSON

## 6. Stati e transizioni della pratica

```
richiesta → offerta → in_attesa_accettazione → accettata
                                                  ↓
                                          [Bordo] in_attesa_pagamento → materiale_in_arrivo
                                          [Cantiere] materiale_in_arrivo
                                                                            ↓
                                                                    pianificata → in_esecuzione
                                                                                      ↓
                                                            chiusura_tecnica → da_fatturare → chiusa
```

Transizioni sono SOLO via service `PraticheService.transition(id, evento, payload)`. Ogni transizione scrive audit_log.

## 7. Import dati esistenti

Script `scripts/import-excel.ts` esegue, idempotente:

1. **Impianti.xlsx** sheet VENDUTI → imbarcazioni + impianti (chiave: `cantiere + costruzione` per imbarcazione; `SN HAG` o `SN DVZ` per impianto)
2. **Master List** to be delivered + delivered → ordini Hamann (gestione futura, parcheggio in tabella `master_list_hamann`)
3. **TG2020** ogni sheet anno + sheet "Da ravviare/Attesa Ord/Da Certificare" → pratiche storiche (stato derivato dal sheet) e preventivi storici
4. **Ferretti-Custom-Wally** sheet "Listino" → listino_cantiere; sheet per modello (`30`, `33`, `34`...) → listino_scafo_personalizzato
5. **DETTAGLIO INTERVENTI** anni → assegnazione_intervento storiche

Script registra warning per righe ambigue; richiede review manuale post-import. Importato in transazione; rollback se >5% righe fallite.

## 8. Generazione documenti

- **Preventivo**: template handlebars per HTML → puppeteer → PDF; oppure `docx` per output Word editabile (utente vuole entrambi).
- **DDT, certificati, fatture proforma**: HTML→PDF puppeteer.
- Template storati in `templates/` versionati in git; placeholder schema documentato.

## 9. App mobile (PWA)

- Stessa codebase Next.js, route dedicate `/m/*` con UI ottimizzata mobile.
- Funzionalità offline (service worker) per zone scarsa connessione (porti).
- Camera API per foto; canvas signature pad per firme.
- Sync coda: report bozza salvato locale (IndexedDB), upload alla rete disponibile.

## 10. Sicurezza & permessi

- RBAC per ruolo, applicato sia in UI sia in route handlers (middleware).
- Tecnico_campo: vede solo le pratiche dove è assegnato + crea/modifica report.
- Amministrazione: tutto eccetto delete (solo admin).
- File su disco: path con UUID, mai filename utente; rate-limit upload.
- Backup giornaliero Postgres → volume separato; retention 30 giorni.

## 11. Deploy

**Dev locale**: `docker-compose up` avvia Postgres + Next dev server con HMR.

**Prod (Dokploy)**:
- Container Next.js (multistage Dockerfile, output standalone)
- Container Postgres con volume persistente
- Container Caddy/Traefik (gestito da Dokploy) per HTTPS
- Variabili d'ambiente via Dokploy UI
- Migrations Drizzle eseguite all'avvio (job init)
- Volume `/uploads` montato e backuppato

## 12. Roadmap implementativa

Spec singola, ma implementazione **a slice verticali rilasciabili**:

| Slice | Contenuto | Esito |
|---|---|---|
| **S0 — Foundation** | Docker, Postgres, Next scaffold, Drizzle, auth base, schema completo, import Excel base | Sistema deployabile, dati importati, login funzionante |
| **S1 — Anagrafiche** | CRUD clienti/imbarcazioni/impianti/tecnici/sedi, ricerca + filtri, vista storico per imbarcazione | Sostituisce consultazione `Impianti.xlsx` |
| **S2 — Pratiche & Preventivi** | Apertura pratica, preventivo con righe, generazione PDF/DOCX, upload firma/PO, transizioni stato (step 1-4 del flusso) | Sostituisce template Word + parte di TG2020 |
| **S3 — Listini cantiere** | Caricamento listini, prezzi per scafo, integrazione con righe preventivo | Sostituisce `Ferretti-Custom-Wally.xls` |
| **S4 — Pianificazione** | Calendario settimanale per sede, assegnazione tecnici, conflitti (step 7) | Sostituisce `DETTAGLIO INTERVENTI` |
| **S5 — Ordini & Magazzino** | PO in/out, stock, DDT (step 5-6) | Workflow ricambi |
| **S6 — Field Report PWA** | App mobile per tecnici (step 8), foto, firma, EXTRA → nuova pratica | Sostituisce report cartacei |
| **S7 — Fatturazione & Chiusura** | Proforma, SAL, finale, certificati, archivio (step 9-10) | Chiude il flusso end-to-end |

Ogni slice ha la sua sotto-spec in `docs/superpowers/specs/<data>-S<n>-*.md` quando viene affrontato.

## 13. Cosa viene implementato nella sessione corrente

- Scaffolding completo (Docker, Next, Drizzle, shadcn, auth)
- Schema database completo (tutte le entità sopra)
- Script di import Excel per imbarcazioni/impianti (S0 + parte di S1)
- UI base di navigazione + lista clienti/imbarcazioni (S1 parziale)
- Documentazione setup

Le slice S2-S7 vengono affrontate in sessioni successive con sotto-spec dedicate.

## 14. Decisioni rimandate

- Integrazione SDI/fatturazione elettronica (S7+): valutare provider (Aruba/Fatture in Cloud API)
- Notifiche email/SMS al cliente (post-MVP)
- Reportistica/dashboard KPI (post-MVP)
- App nativa iOS/Android (post-MVP, se PWA non basta)
- Multi-azienda/multi-sede contabile (non richiesto)
