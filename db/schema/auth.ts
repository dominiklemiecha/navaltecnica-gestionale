import { pgTable, uuid, varchar, timestamp, text, primaryKey, integer, boolean } from "drizzle-orm/pg-core";
import { ruoloUtenteEnum } from "./_enums";
import { tecnici } from "./anagrafiche";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  nome: varchar("nome", { length: 255 }),
  ruolo: ruoloUtenteEnum("ruolo").notNull().default("solo_lettura"),
  tecnicoId: uuid("tecnico_id").references(() => tecnici.id, { onDelete: "set null" }),
  attivo: boolean("attivo").notNull().default(true),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: varchar("token_type", { length: 64 }),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: varchar("session_state", { length: 255 }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) })
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) })
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  tabella: varchar("tabella", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 64 }).notNull(),
  azione: varchar("azione", { length: 32 }).notNull(),
  diff: text("diff"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
