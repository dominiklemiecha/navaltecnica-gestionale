import { pgTable, uuid, varchar, integer, date, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Specchio della Master List Hamann (ordini interni NTC verso Hamann).
 * Tabella di staging/consultazione separata dal core gestionale.
 */
export const masterListHamann = pgTable(
  "master_list_hamann",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stato: varchar("stato", { length: 32 }).notNull(), // "delivered" | "to_be_delivered"
    projectManager: varchar("project_manager", { length: 100 }),
    orderNo: varchar("order_no", { length: 64 }),
    serialNumber: varchar("serial_number", { length: 64 }),
    yard: varchar("yard", { length: 100 }),
    hull: varchar("hull", { length: 100 }),
    type: varchar("type", { length: 64 }),
    delDateYardReq: date("del_date_yard_req"),
    delDateHamannOC: date("del_date_hamann_oc"),
    delayOnYardReq: integer("delay_on_yard_req"),
    delayOnHamannOC: integer("delay_on_hamann_oc"),
    deliveredAt: date("delivered_at"),
    note: text("note"),
    importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    snIdx: index("ml_sn_idx").on(t.serialNumber),
    yardHullIdx: index("ml_yard_hull_idx").on(t.yard, t.hull),
  })
);
