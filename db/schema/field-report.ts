import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  date,
  time,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { pratiche } from "./pratiche";
import { tecnici } from "./anagrafiche";
import { statoReportEnum } from "./_enums";
import { articoli } from "./ordini";

export const reportInterventi = pgTable(
  "report_interventi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    praticaId: uuid("pratica_id")
      .notNull()
      .references(() => pratiche.id, { onDelete: "cascade" }),
    tecnicoCompilatoreId: uuid("tecnico_compilatore_id")
      .notNull()
      .references(() => tecnici.id, { onDelete: "restrict" }),
    dataIntervento: date("data_intervento").notNull(),
    orarioInizio: time("orario_inizio"),
    orarioFine: time("orario_fine"),
    oreLavorate: numeric("ore_lavorate", { precision: 5, scale: 2 }),
    descrizioneAttivita: text("descrizione_attivita"),
    anomalie: text("anomalie"),
    generaExtra: boolean("genera_extra").notNull().default(false),
    extraPraticaId: uuid("extra_pratica_id"),
    firmaClientePath: text("firma_cliente_path"),
    firmaTecnicoPath: text("firma_tecnico_path"),
    nomeClienteFirma: text("nome_cliente_firma"),
    stato: statoReportEnum("stato").notNull().default("bozza"),
    inviatoAt: timestamp("inviato_at", { withTimezone: true }),
    validatoAt: timestamp("validato_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ praticaIdx: index("report_pratica_idx").on(t.praticaId) })
);

export const reportMateriali = pgTable("report_materiali", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reportInterventi.id, { onDelete: "cascade" }),
  articoloId: uuid("articolo_id").references(() => articoli.id, { onDelete: "set null" }),
  descrizione: text("descrizione").notNull(),
  quantita: numeric("quantita", { precision: 12, scale: 3 }).notNull(),
  daStock: boolean("da_stock").notNull().default(true),
  note: text("note"),
});

export const reportFoto = pgTable("report_foto", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reportInterventi.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  didascalia: text("didascalia"),
  ordine: integer("ordine").notNull().default(0),
});
