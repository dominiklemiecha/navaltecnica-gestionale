#!/bin/sh
set -e

cd /app

echo "==> Attendo Postgres..."
until node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>{c.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done
echo "    Postgres pronto."

if [ ! -d node_modules ] || [ ! -f node_modules/.install-complete ]; then
  echo "==> Installo dipendenze npm..."
  npm install --legacy-peer-deps --no-audit --no-fund
  touch node_modules/.install-complete
fi

if [ ! -d db/migrations ] || [ -z "$(ls -A db/migrations 2>/dev/null)" ]; then
  echo "==> Genero migrazioni Drizzle..."
  npx drizzle-kit generate --name init
fi

echo "==> Applico migrazioni..."
npm run db:migrate

if [ ! -f .seeded ]; then
  echo "==> Seed iniziale (utenti, sedi)..."
  npm run db:seed
  touch .seeded
fi

if [ ! -f .imported ] && [ -d data-sources ] && [ -n "$(ls -A data-sources/*.xlsx 2>/dev/null)" ]; then
  echo "==> Import dati storici Excel..."
  npm run import:excel || echo "    (import fallito, prosegui — controlla i dati in data-sources/)"
  touch .imported
fi

echo "==> Avvio Next.js dev (webpack + polling per HMR su bind-mount Windows)..."
exec npm run dev:docker
