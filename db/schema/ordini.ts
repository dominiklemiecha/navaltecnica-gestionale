import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  date,
  index,
} from "drizzle-orm/pg-core";
import { pratiche } from "./pratiche";
import { fornitori } from "./anagrafiche";
import { tipoOrdineEnum, tipoMovimentoStockEnum } from "./_enums";

export const articoli = pgTable(
  "articoli",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codice: varchar("codice", { length: 64 }).notNull().unique(),
    descrizione: text("descrizione").notNull(),
    unitaMisura: varchar("unita_misura", { length: 16 }).default("nr"),
    fornitoreDefaultId: uuid("fornitore_default_id").references(() => fornitori.id, {
      onDelete: "set null",
    }),
    prezzoAcquistoCorrente: numeric("prezzo_acquisto_corrente", { precision: 12, scale: 2 }),
    qtaStock: numeric("qta_stock", { precision: 12, scale: 3 }).notNull().default("0"),
    qtaSottoScorta: numeric("qta_sotto_scorta", { precision: 12, scale: 3 }).default("0"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ descIdx: index("articoli_desc_idx").on(t.descrizione) })
);

export const ordini = pgTable(
  "ordini",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: tipoOrdineEnum("tipo").notNull(),
    praticaId: uuid("pratica_id").references(() => pratiche.id, { onDelete: "set null" }),
    numero: varchar("numero", { length: 100 }).notNull(),
    fornitoreId: uuid("fornitore_id").references(() => fornitori.id, { onDelete: "set null" }),
    dataOrdine: date("data_ordine"),
    dataConsegnaPrevista: date("data_consegna_prevista"),
    dataConsegnaEffettiva: date("data_consegna_effettiva"),
    importo: numeric("importo", { precision: 12, scale: 2 }),
    valuta: varchar("valuta", { length: 8 }).default("EUR"),
    stato: varchar("stato", { length: 32 }).default("aperto"),
    filePath: text("file_path"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    praticaIdx: index("ordini_pratica_idx").on(t.praticaId),
    tipoIdx: index("ordini_tipo_idx").on(t.tipo),
  })
);

export const ordiniRighe = pgTable("ordini_righe", {
  id: uuid("id").defaultRandom().primaryKey(),
  ordineId: uuid("ordine_id")
    .notNull()
    .references(() => ordini.id, { onDelete: "cascade" }),
  articoloId: uuid("articolo_id").references(() => articoli.id, { onDelete: "set null" }),
  descrizione: text("descrizione").notNull(),
  quantita: numeric("quantita", { precision: 12, scale: 3 }).notNull(),
  prezzoUnitario: numeric("prezzo_unitario", { precision: 12, scale: 2 }),
  importo: numeric("importo", { precision: 12, scale: 2 }),
});

export const ddt = pgTable("ddt", {
  id: uuid("id").defaultRandom().primaryKey(),
  numero: varchar("numero", { length: 100 }).notNull(),
  dataEmissione: date("data_emissione").notNull(),
  praticaId: uuid("pratica_id").references(() => pratiche.id, { onDelete: "set null" }),
  destinatario: text("destinatario"),
  luogoDestinazione: text("luogo_destinazione"),
  vettore: varchar("vettore", { length: 255 }),
  causaleTrasporto: varchar("causale_trasporto", { length: 100 }),
  filePath: text("file_path"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ddtRighe = pgTable("ddt_righe", {
  id: uuid("id").defaultRandom().primaryKey(),
  ddtId: uuid("ddt_id")
    .notNull()
    .references(() => ddt.id, { onDelete: "cascade" }),
  articoloId: uuid("articolo_id").references(() => articoli.id, { onDelete: "set null" }),
  descrizione: text("descrizione").notNull(),
  quantita: numeric("quantita", { precision: 12, scale: 3 }).notNull(),
});

export const stockMovimenti = pgTable("stock_movimenti", {
  id: uuid("id").defaultRandom().primaryKey(),
  articoloId: uuid("articolo_id")
    .notNull()
    .references(() => articoli.id, { onDelete: "restrict" }),
  tipo: tipoMovimentoStockEnum("tipo").notNull(),
  quantita: numeric("quantita", { precision: 12, scale: 3 }).notNull(),
  praticaId: uuid("pratica_id").references(() => pratiche.id, { onDelete: "set null" }),
  ordineId: uuid("ordine_id").references(() => ordini.id, { onDelete: "set null" }),
  ddtId: uuid("ddt_id").references(() => ddt.id, { onDelete: "set null" }),
  data: timestamp("data", { withTimezone: true }).defaultNow().notNull(),
  note: text("note"),
});
