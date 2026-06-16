import { pgTable, uuid, text, timestamp, date, time, index } from "drizzle-orm/pg-core";
import { pratiche } from "./pratiche";
import { sedi, tecnici } from "./anagrafiche";
import { statoAssegnazioneEnum } from "./_enums";

export const assegnazioniIntervento = pgTable(
  "assegnazioni_intervento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    praticaId: uuid("pratica_id")
      .notNull()
      .references(() => pratiche.id, { onDelete: "cascade" }),
    tecnicoId: uuid("tecnico_id")
      .notNull()
      .references(() => tecnici.id, { onDelete: "restrict" }),
    sedeId: uuid("sede_id").references(() => sedi.id, { onDelete: "set null" }),
    data: date("data").notNull(),
    orarioDa: time("orario_da"),
    orarioA: time("orario_a"),
    stato: statoAssegnazioneEnum("stato").notNull().default("pianificato"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dataIdx: index("assegnazioni_data_idx").on(t.data),
    tecnicoDataIdx: index("assegnazioni_tecnico_data_idx").on(t.tecnicoId, t.data),
    praticaIdx: index("assegnazioni_pratica_idx").on(t.praticaId),
  })
);
