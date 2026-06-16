import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as anagrafiche from "./schema/anagrafiche";
import * as pratiche from "./schema/pratiche";
import * as preventivi from "./schema/preventivi";
import * as listini from "./schema/listini";
import * as ordini from "./schema/ordini";
import * as pianificazione from "./schema/pianificazione";
import * as fieldReport from "./schema/field-report";
import * as fatturazione from "./schema/fatturazione";
import * as documenti from "./schema/documenti";
import * as auth from "./schema/auth";
import * as masterList from "./schema/master-list";

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const schema = {
  ...anagrafiche,
  ...pratiche,
  ...preventivi,
  ...listini,
  ...ordini,
  ...pianificazione,
  ...fieldReport,
  ...fatturazione,
  ...documenti,
  ...auth,
  ...masterList,
};

export const db = drizzle(pool, { schema });
export type DB = typeof db;
