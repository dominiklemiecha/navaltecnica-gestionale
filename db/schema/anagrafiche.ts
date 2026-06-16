import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tipoClienteEnum, tipoImpiantoEnum, ruoloTecnicoEnum } from "./_enums";

export const sedi = pgTable("sedi", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  citta: varchar("citta", { length: 100 }),
  attiva: boolean("attiva").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clienti = pgTable(
  "clienti",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: tipoClienteEnum("tipo").notNull(),
    ragioneSociale: varchar("ragione_sociale", { length: 255 }).notNull(),
    nomeBreve: varchar("nome_breve", { length: 100 }),
    partitaIva: varchar("partita_iva", { length: 32 }),
    codiceFiscale: varchar("codice_fiscale", { length: 32 }),
    indirizzo: text("indirizzo"),
    citta: varchar("citta", { length: 100 }),
    cap: varchar("cap", { length: 16 }),
    paese: varchar("paese", { length: 64 }).default("IT"),
    pec: varchar("pec", { length: 255 }),
    sdiCode: varchar("sdi_code", { length: 16 }),
    terminiPagamentoGiorni: integer("termini_pagamento_giorni"),
    note: text("note"),
    attivo: boolean("attivo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nomeBreveIdx: index("clienti_nome_breve_idx").on(t.nomeBreve),
    ragSocIdx: index("clienti_rag_soc_idx").on(t.ragioneSociale),
    tipoIdx: index("clienti_tipo_idx").on(t.tipo),
  })
);

export const referentiCliente = pgTable("referenti_cliente", {
  id: uuid("id").defaultRandom().primaryKey(),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => clienti.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 255 }).notNull(),
  ruolo: varchar("ruolo", { length: 100 }),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  principale: boolean("principale").notNull().default(false),
});

export const imbarcazioni = pgTable(
  "imbarcazioni",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: varchar("nome", { length: 255 }),
    hullNumber: varchar("hull_number", { length: 100 }),
    modello: varchar("modello", { length: 100 }),
    cantiereCostruttoreId: uuid("cantiere_costruttore_id").references(() => clienti.id, {
      onDelete: "set null",
    }),
    proprietarioAttualeId: uuid("proprietario_attuale_id").references(() => clienti.id, {
      onDelete: "set null",
    }),
    armatore: varchar("armatore", { length: 255 }),
    metri: numeric("metri", { precision: 6, scale: 2 }),
    annoCostruzione: integer("anno_costruzione"),
    bandiera: varchar("bandiera", { length: 100 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nomeIdx: index("imbarcazioni_nome_idx").on(t.nome),
    hullIdx: index("imbarcazioni_hull_idx").on(t.hullNumber),
    cantiereIdx: index("imbarcazioni_cantiere_idx").on(t.cantiereCostruttoreId),
    cantiereHullUq: uniqueIndex("imbarcazioni_cantiere_hull_uq")
      .on(t.cantiereCostruttoreId, t.hullNumber)
      .where(sql`${t.hullNumber} IS NOT NULL`),
  })
);

export const impianti = pgTable(
  "impianti",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    imbarcazioneId: uuid("imbarcazione_id")
      .notNull()
      .references(() => imbarcazioni.id, { onDelete: "cascade" }),
    tipo: tipoImpiantoEnum("tipo").notNull(),
    modello: varchar("modello", { length: 100 }),
    tensione: varchar("tensione", { length: 32 }),
    serialNumber: varchar("serial_number", { length: 64 }),
    capacita: varchar("capacita", { length: 64 }),
    dataInstallazione: date("data_installazione"),
    note: text("note"),
    attivo: boolean("attivo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    imbarcazioneIdx: index("impianti_imbarcazione_idx").on(t.imbarcazioneId),
    snIdx: index("impianti_sn_idx").on(t.serialNumber),
    tipoIdx: index("impianti_tipo_idx").on(t.tipo),
  })
);

export const tecnici = pgTable("tecnici", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cognome: varchar("cognome", { length: 255 }),
  ruolo: ruoloTecnicoEnum("ruolo").notNull().default("tecnico"),
  sedeId: uuid("sede_id").references(() => sedi.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  costoOrario: numeric("costo_orario", { precision: 10, scale: 2 }),
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fornitori = pgTable("fornitori", {
  id: uuid("id").defaultRandom().primaryKey(),
  ragioneSociale: varchar("ragione_sociale", { length: 255 }).notNull(),
  partitaIva: varchar("partita_iva", { length: 32 }),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  paese: varchar("paese", { length: 64 }).default("IT"),
  tempiConsegnaGiorniMedi: integer("tempi_consegna_giorni_medi"),
  note: text("note"),
  attivo: boolean("attivo").notNull().default(true),
});
