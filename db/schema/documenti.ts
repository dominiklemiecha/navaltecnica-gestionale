import { pgTable, uuid, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { tipoDocumentoEnum } from "./_enums";

export const documenti = pgTable(
  "documenti",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: tipoDocumentoEnum("tipo").notNull(),
    praticaId: uuid("pratica_id"),
    preventivoId: uuid("preventivo_id"),
    ordineId: uuid("ordine_id"),
    reportId: uuid("report_id"),
    fatturaId: uuid("fattura_id"),
    descrizione: text("descrizione"),
    filePath: text("file_path").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    sha256: varchar("sha256", { length: 64 }),
    fileSize: integer("file_size"),
    uploadedBy: uuid("uploaded_by"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tipoIdx: index("documenti_tipo_idx").on(t.tipo),
    praticaIdx: index("documenti_pratica_idx").on(t.praticaId),
  })
);
