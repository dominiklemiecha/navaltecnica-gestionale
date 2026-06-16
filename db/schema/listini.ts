import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { clienti } from "./anagrafiche";

export const listiniCantiere = pgTable(
  "listini_cantiere",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cantiereId: uuid("cantiere_id")
      .notNull()
      .references(() => clienti.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 255 }).notNull(),
    validoDa: date("valido_da").notNull(),
    validoA: date("valido_a"),
    fileOriginalePath: text("file_originale_path"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ cantiereIdx: index("listini_cantiere_idx").on(t.cantiereId) })
);

export const listiniRighe = pgTable(
  "listini_righe",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listinoId: uuid("listino_id")
      .notNull()
      .references(() => listiniCantiere.id, { onDelete: "cascade" }),
    modelloScafo: varchar("modello_scafo", { length: 64 }),
    descrizioneArticolo: text("descrizione_articolo").notNull(),
    codiceArticolo: varchar("codice_articolo", { length: 64 }),
    prezzoAcquisto: numeric("prezzo_acquisto", { precision: 12, scale: 2 }),
    prezzoVendita: numeric("prezzo_vendita", { precision: 12, scale: 2 }),
    sconto: numeric("sconto", { precision: 6, scale: 4 }),
    note: text("note"),
  },
  (t) => ({
    listinoIdx: index("listini_righe_listino_idx").on(t.listinoId),
    modelloIdx: index("listini_righe_modello_idx").on(t.modelloScafo),
  })
);

export const listiniScafoPersonalizzati = pgTable(
  "listini_scafo_personalizzati",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listinoId: uuid("listino_id")
      .notNull()
      .references(() => listiniCantiere.id, { onDelete: "cascade" }),
    hullNumber: varchar("hull_number", { length: 64 }).notNull(),
    modelloScafo: varchar("modello_scafo", { length: 64 }),
    tensione: varchar("tensione", { length: 32 }),
    descrizioneArticolo: text("descrizione_articolo").notNull(),
    prezzoVendita: numeric("prezzo_vendita", { precision: 12, scale: 2 }),
    prezzoAcquisto: numeric("prezzo_acquisto", { precision: 12, scale: 2 }),
    dataOrdine: date("data_ordine"),
    dataConsegna: date("data_consegna"),
    note: text("note"),
  },
  (t) => ({
    hullIdx: index("listini_scafo_hull_idx").on(t.hullNumber),
    listinoIdx: index("listini_scafo_listino_idx").on(t.listinoId),
  })
);
