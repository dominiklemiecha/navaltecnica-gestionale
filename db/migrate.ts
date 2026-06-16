import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Done.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
