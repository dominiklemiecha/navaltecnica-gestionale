#!/bin/sh
set -e
cd /app

echo "==> Attendo Postgres..."
until node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>{c.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done

echo "==> Migrazioni..."
node -e "require('tsx/cjs').register?.(); require('./db/migrate.ts')" 2>/dev/null || npx tsx db/migrate.ts || true

echo "==> Avvio Next prod..."
exec node server.js
