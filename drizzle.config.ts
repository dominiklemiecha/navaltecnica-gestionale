import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema/*.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://ntc:ntcdev@localhost:5432/ntc_gestionale",
  },
  strict: true,
} satisfies Config;
