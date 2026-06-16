import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";
import { pratiche } from "./pratiche";
import { tipoFatturaEnum, statoFatturaEnum } from "./_enums";

export const fatture = pgTable(
  "fatture",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    praticaId: uuid("pratica_id")
      .notNull()
      .references(() => pratiche.id, { onDelete: "restrict" }),
    tipo: tipoFatturaEnum("tipo").notNull(),
    numero: varchar("numero", { length: 64 }).notNull(),
    annoFiscale: varchar("anno_fiscale", { length: 8 }).notNull(),
    dataEmissione: date("data_emissione").notNull(),
    importoNetto: numeric("importo_netto", { precision: 12, scale: 2 }).notNull(),
    iva: numeric("iva", { precision: 12, scale: 2 }).notNull().default("0"),
    totale: numeric("totale", { precision: 12, scale: 2 }).notNull(),
    stato: statoFatturaEnum("stato").notNull().default("emessa"),
    riferimentoSdi: varchar("riferimento_sdi", { length: 128 }),
    filePath: text("file_path"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    praticaIdx: index("fatture_pratica_idx").on(t.praticaId),
    statoIdx: index("fatture_stato_idx").on(t.stato),
  })
);

export const pagamenti = pgTable("pagamenti", {
  id: uuid("id").defaultRandom().primaryKey(),
  fatturaId: uuid("fattura_id")
    .notNull()
    .references(() => fatture.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  importo: numeric("importo", { precision: 12, scale: 2 }).notNull(),
  modalita: varchar("modalita", { length: 64 }),
  riferimento: text("riferimento"),
  note: text("note"),
});

export const certificati = pgTable("certificati", {
  id: uuid("id").defaultRandom().primaryKey(),
  praticaId: uuid("pratica_id")
    .notNull()
    .references(() => pratiche.id, { onDelete: "cascade" }),
  numero: varchar("numero", { length: 64 }),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  dataEmissione: date("data_emissione").notNull(),
  filePath: text("file_path"),
  note: text("note"),
});
