// Migratore di produzione in CommonJS puro: nessuna dipendenza da tsx/esbuild.
// Viene eseguito dal container con `cd /opt/migrate && node migrate.cjs`,
// così risolve drizzle-orm/pg dal node_modules completo in /opt/migrate.
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "/app/db/migrations" });
  await pool.end();
  console.log("Migrazioni completate.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
