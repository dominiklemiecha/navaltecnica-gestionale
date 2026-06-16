import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { pratiche } from "./pratiche";
import { modalitaAccettazioneEnum, tipoPreventivoRigaEnum } from "./_enums";
import { impianti } from "./anagrafiche";

export const preventivi = pgTable(
  "preventivi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    praticaId: uuid("pratica_id")
      .notNull()
      .references(() => pratiche.id, { onDelete: "cascade" }),
    codiceOfferta: varchar("codice_offerta", { length: 64 }).notNull(),
    versione: integer("versione").notNull().default(1),
    totaleNetto: numeric("totale_netto", { precision: 12, scale: 2 }),
    sconto: numeric("sconto", { precision: 6, scale: 2 }),
    iva: numeric("iva", { precision: 6, scale: 2 }).default("22"),
    totaleLordo: numeric("totale_lordo", { precision: 12, scale: 2 }),
    validitaGiorni: integer("validita_giorni").default(30),
    fileGeneratoPath: text("file_generato_path"),
    fileFirmatoPath: text("file_firmato_path"),
    dataInvio: timestamp("data_invio", { withTimezone: true }),
    dataAccettazione: timestamp("data_accettazione", { withTimezone: true }),
    modalitaAccettazione: modalitaAccettazioneEnum("modalita_accettazione"),
    riferimentoPo: varchar("riferimento_po", { length: 100 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ praticaIdx: index("preventivi_pratica_idx").on(t.praticaId) })
);

export const preventiviRighe = pgTable(
  "preventivi_righe",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    preventivoId: uuid("preventivo_id")
      .notNull()
      .references(() => preventivi.id, { onDelete: "cascade" }),
    tipo: tipoPreventivoRigaEnum("tipo").notNull(),
    descrizione: text("descrizione").notNull(),
    codiceArticolo: varchar("codice_articolo", { length: 64 }),
    impiantoId: uuid("impianto_id").references(() => impianti.id, { onDelete: "set null" }),
    quantita: numeric("quantita", { precision: 12, scale: 3 }).notNull().default("1"),
    unitaMisura: varchar("unita_misura", { length: 16 }).default("nr"),
    prezzoUnitario: numeric("prezzo_unitario", { precision: 12, scale: 2 }).notNull().default("0"),
    sconto: numeric("sconto", { precision: 6, scale: 2 }).default("0"),
    importo: numeric("importo", { precision: 12, scale: 2 }).notNull().default("0"),
    ordine: integer("ordine").notNull().default(0),
  },
  (t) => ({ prevIdx: index("preventivi_righe_prev_idx").on(t.preventivoId) })
);
