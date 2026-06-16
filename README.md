# Navaltecnica — Gestionale Service

Gestionale completo per il flusso service/installazioni Navaltecnica:
ricezione richiesta → preventivo → accettazione → pratica → ordini ricambi →
pianificazione → esecuzione (app mobile) → chiusura tecnica → fatturazione.

Sostituisce progressivamente i file Excel/Word esistenti (`Impianti.xlsx`,
`TG2020.xlsx`, `DETTAGLIO INTERVENTI.xls`, listini per cantiere, template
preventivi).

## Stack

- **PostgreSQL 16** (Docker)
- **Next.js 15** App Router + TypeScript
- **Drizzle ORM** con migrazioni SQL
- **Auth.js v5** (credentials)
- **shadcn/ui** + Tailwind
- **Docker Compose** per dev; deploy target **Dokploy**

## Setup locale

### 1. Prerequisiti

- Docker Desktop
- Node 22+ (solo se vuoi eseguire script fuori dal container)

### 2. Avvio (singolo comando)

```bash
cp .env.example .env
docker compose up
```

Al primo avvio l'entrypoint del container `app` esegue automaticamente, in
ordine, dentro al container:

1. attesa che Postgres sia raggiungibile
2. `npm install` (cached su volume `node_modules`)
3. generazione migrazioni Drizzle (`drizzle-kit generate`)
4. applicazione migrazioni (`db:migrate`)
5. seed iniziale (utenti admin + sedi) — solo la prima volta
6. import dati Excel da `data-sources/` se presenti — solo la prima volta
7. avvio `next dev` su `0.0.0.0:3000`

L'app è su http://localhost:3000.

Gli step 5-6 si eseguono una sola volta: i sentinella `.seeded` e `.imported`
vengono creati nella root del progetto. Cancellali per rifare seed/import.

Login di default:
- `admin@navaltecnica.it` / `admin` (ruolo admin)
- `ufficio@navaltecnica.it` / `ufficio` (ruolo amministrazione)

**Cambia subito le password in produzione.**

### 4. Importa dati storici

I file Excel originali vanno in `data-sources/` (già spostati dal setup
iniziale). Lo script di import è **idempotente** — può girare più volte.

```bash
npm run import:excel              # tutto
npm run import:excel -- --impianti      # solo Impianti.xlsx
npm run import:excel -- --master-list   # solo Master List Hamann
```

## Struttura

```
.
├── data-sources/        # file Excel originali (non commitati)
├── docker/              # Dockerfile + init scripts Postgres
├── docs/superpowers/    # spec di design (vedi 2026-05-19-gestionale-navaltecnica-design.md)
├── db/
│   ├── schema/          # schema Drizzle per dominio
│   ├── migrations/      # SQL generato da drizzle-kit
│   ├── client.ts        # connessione + schema esportato
│   └── migrate.ts       # runner migrazioni
├── scripts/
│   ├── seed.ts          # utenti + sedi
│   └── import-excel.ts  # import storico
├── src/
│   ├── app/
│   │   ├── (app)/       # routes protette (layout con sidebar)
│   │   ├── login/       # login pubblico
│   │   └── api/auth/    # NextAuth handlers
│   ├── components/ui/   # shadcn-style primitives
│   ├── lib/             # auth, utils
│   └── modules/         # service layer per dominio
│       └── pratiche/    # state machine pratica
└── middleware.ts        # gate auth globale
```

## Modello di dominio

Vedi la spec completa: `docs/superpowers/specs/2026-05-19-gestionale-navaltecnica-design.md`.

Entità chiave: `clienti` (cantiere/bordo), `imbarcazioni`, `impianti` (HAG, DVZ
OWS/STP/GT, Matrix, AP Marine, ecc.), `pratiche` (con state machine 12 stati),
`preventivi`, `listini_cantiere`, `ordini`, `ddt`, `stock_movimenti`,
`assegnazioni_intervento`, `report_interventi`, `fatture`, `documenti`.

### State machine pratica

```
richiesta → offerta → in_attesa_accettazione → accettata
  → [in_attesa_pagamento (Bordo) | materiale_in_arrivo (Cantiere)]
  → pianificata → in_esecuzione → chiusura_tecnica → da_fatturare → chiusa
```

Transizioni gestite **solo** via `src/modules/pratiche/service.ts#transizionePratica`
con audit in `transizioni_pratica`.

## Roadmap

Il design è completo per tutto il flusso. L'implementazione procede a slice:

| Slice | Stato | Contenuto |
|---|---|---|
| S0 Foundation | ✅ done | Docker, DB, auth, schema completo |
| S1 Anagrafiche | ✅ done (CRUD base) | Clienti, imbarcazioni, impianti, tecnici, sedi |
| S2 Pratiche & Preventivi | 🟡 in corso (pratiche done) | Preventivi con template Word/PDF |
| S3 Listini cantiere | ⬜ todo | Listini per cantiere + scafo |
| S4 Pianificazione | ⬜ todo | Calendario tecnici |
| S5 Ordini & Magazzino | ⬜ todo | PO, stock, DDT |
| S6 Field Report PWA | ⬜ todo | App mobile tecnici |
| S7 Fatturazione | ⬜ todo | Proforma, SAL, finale, certificati |

## Performance: dev vs prod

Lo `docker compose up` di default usa **dev mode**: Next compila ogni route al primo click → primo hit lento (~2s con Turbopack), click successivi veloci.

Per **uso quotidiano in azienda** conviene la **prod mode** (compilazione una volta, poi navigazione fulminea):

```powershell
# arresta il dev
docker compose down

# build & avvia profile prod (la prima build richiede ~5 minuti)
docker compose --profile prod up -d --build
```

Differenze:

| Aspetto | `dev` | `prod` |
|---|---|---|
| Primo click route | ~2s | ~150ms |
| Click successivi | ~500ms | ~50ms |
| Hot reload codice | ✓ | ✗ (rebuild necessario) |
| Adatto a | sviluppo | uso quotidiano + Dokploy |

Quando l'app sarà su Dokploy lo userà già in prod mode automaticamente (è il `target: prod` del Dockerfile).

## Deploy su Dokploy

1. Pusha il repo su GitHub/GitLab
2. Crea un nuovo progetto Dokploy → tipo *Compose*
3. Punta al `docker-compose.yml`
4. Imposta env vars (DATABASE_URL, NEXTAUTH_SECRET, ecc.)
5. Cambia `BUILD_TARGET=prod` per build standalone
6. Aggiungi un volume per `/app/uploads` (file caricati)
7. Configura Traefik (gestito da Dokploy) per HTTPS
8. Prima del primo avvio: `npm run db:migrate && npm run db:seed`

Backup raccomandato:
- Dump giornaliero Postgres → storage esterno (S3/Backblaze)
- Snapshot del volume `uploads`

## Comandi utili

```bash
npm run dev           # next dev locale (senza docker)
npm run db:studio     # Drizzle Studio (UI esplora DB)
npm run db:generate   # genera nuova migrazione da schema
npm run db:migrate    # applica migrazioni
npm run db:seed       # seed utenti+sedi
npm run import:excel  # import dati storici
```
