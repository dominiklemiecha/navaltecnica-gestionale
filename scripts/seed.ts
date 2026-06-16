import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "../db/client";
import { users } from "../db/schema/auth";
import { sedi } from "../db/schema/anagrafiche";
import { eq } from "drizzle-orm";

async function ensureUser(email: string, nome: string, password: string, ruolo: any) {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(`User ${email} già presente`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ email, nome, passwordHash, ruolo });
  console.log(`Created user ${email} (${ruolo})`);
}

async function ensureSede(nome: string, citta: string) {
  const [existing] = await db.select().from(sedi).where(eq(sedi.nome, nome)).limit(1);
  if (existing) return;
  await db.insert(sedi).values({ nome, citta });
  console.log(`Created sede ${nome}`);
}

async function main() {
  await ensureUser("admin@navaltecnica.it", "Admin", "admin", "admin");
  await ensureUser("ufficio@navaltecnica.it", "Ufficio", "ufficio", "amministrazione");

  const sediNTC = [
    ["Livorno", "Livorno"],
    ["La Spezia", "La Spezia"],
    ["Viareggio", "Viareggio"],
    ["Genova", "Genova"],
    ["Ancona", "Ancona"],
    ["Carrara", "Carrara"],
    ["Pisa", "Pisa"],
    ["Loano", "Loano"],
    ["Savona", "Savona"],
    ["Sanremo", "Sanremo"],
    ["Imperia", "Imperia"],
    ["Muggiano", "La Spezia"],
    ["Marina di Massa", "Massa"],
    ["Officina", "Sede NTC"],
  ];
  for (const [n, c] of sediNTC) await ensureSede(n, c);

  console.log("Seed completato.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
