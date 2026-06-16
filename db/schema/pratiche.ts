import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  index,
  uniqueIndex,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import { clienti, imbarcazioni, sedi, tecnici } from "./anagrafiche";
import { statoPraticaEnum, tipoLavoroEnum } from "./_enums";

export const pratiche = pgTable(
  "pratiche",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codice: varchar("codice", { length: 32 }).notNull(),
    annoRiferimento: integer("anno_riferimento").notNull(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clienti.id, { onDelete: "restrict" }),
    imbarcazioneId: uuid("imbarcazione_id").references(() => imbarcazioni.id, {
      onDelete: "set null",
    }),
    sedeInterventoId: uuid("sede_intervento_id").references(() => sedi.id, {
      onDelete: "set null",
    }),
    stato: statoPraticaEnum("stato").notNull().default("richiesta"),
    tipoLavoro: tipoLavoroEnum("tipo_lavoro"),
    descrizioneProblema: text("descrizione_problema"),
    tempisticheRichieste: text("tempistiche_richieste"),
    praticaPadreId: uuid("pratica_padre_id"),
    dataApertura: timestamp("data_apertura", { withTimezone: true }).defaultNow().notNull(),
    dataChiusura: timestamp("data_chiusura", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    codiceAnnoUq: uniqueIndex("pratiche_codice_anno_uq").on(t.codice, t.annoRiferimento),
    statoIdx: index("pratiche_stato_idx").on(t.stato),
    clienteIdx: index("pratiche_cliente_idx").on(t.clienteId),
    imbarcazioneIdx: index("pratiche_imbarcazione_idx").on(t.imbarcazioneId),
  })
);

export const praticheTecnici = pgTable(
  "pratiche_tecnici",
  {
    praticaId: uuid("pratica_id")
      .notNull()
      .references(() => pratiche.id, { onDelete: "cascade" }),
    tecnicoId: uuid("tecnico_id")
      .notNull()
      .references(() => tecnici.id, { onDelete: "cascade" }),
    ruoloNellaPratica: varchar("ruolo_nella_pratica", { length: 100 }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.praticaId, t.tecnicoId] }) })
);

export const praticheImpianti = pgTable(
  "pratiche_impianti",
  {
    praticaId: uuid("pratica_id")
      .notNull()
      .references(() => pratiche.id, { onDelete: "cascade" }),
    impiantoId: uuid("impianto_id").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.praticaId, t.impiantoId] }) })
);

export const transizioniPratica = pgTable("transizioni_pratica", {
  id: uuid("id").defaultRandom().primaryKey(),
  praticaId: uuid("pratica_id")
    .notNull()
    .references(() => pratiche.id, { onDelete: "cascade" }),
  statoDa: statoPraticaEnum("stato_da"),
  statoA: statoPraticaEnum("stato_a").notNull(),
  evento: varchar("evento", { length: 64 }).notNull(),
  payload: text("payload"),
  utenteId: uuid("utente_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
