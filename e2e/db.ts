import { execFileSync } from "node:child_process";

const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? "ntc_db";
const DB_USER = process.env.E2E_DB_USER ?? "ntc";
const DB_NAME = process.env.E2E_DB_NAME ?? "ntc_gestionale";

/** Esegue una query e ritorna l'output grezzo (tuple-only, unaligned). */
export function sql(query: string): string {
  return execFileSync(
    "docker",
    ["exec", DB_CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME, "-t", "-A", "-c", query],
    { encoding: "utf8" }
  ).trim();
}

/** Esegue una query che ritorna un singolo valore scalare. */
export function sqlScalar(query: string): string {
  return sql(query).split("\n")[0]?.trim() ?? "";
}
