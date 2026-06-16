import { NextResponse } from "next/server";
import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { ilike, or, eq, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ items: [] }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });
  const like = `%${q}%`;

  const items: any[] = [];

  // Pratiche per codice
  const prRows = await db
    .select({
      id: pratiche.id,
      codice: pratiche.codice,
      anno: pratiche.annoRiferimento,
      stato: pratiche.stato,
      cliente: clienti.ragioneSociale,
      barca: imbarcazioni.nome,
    })
    .from(pratiche)
    .leftJoin(clienti, eq(clienti.id, pratiche.clienteId))
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, pratiche.imbarcazioneId))
    .where(ilike(pratiche.codice, like))
    .orderBy(desc(pratiche.createdAt))
    .limit(5);
  for (const p of prRows) {
    items.push({
      kind: "pratica",
      url: `/pratiche/${p.id}`,
      primary: `${p.codice}/${String(p.anno).slice(-2)}`,
      secondary: `${p.cliente ?? ""} · ${p.barca ?? ""} · ${p.stato}`,
    });
  }

  // Imbarcazioni
  const imbRows = await db
    .select({
      id: imbarcazioni.id,
      nome: imbarcazioni.nome,
      hull: imbarcazioni.hullNumber,
      modello: imbarcazioni.modello,
      cantiere: clienti.ragioneSociale,
    })
    .from(imbarcazioni)
    .leftJoin(clienti, eq(clienti.id, imbarcazioni.cantiereCostruttoreId))
    .where(
      or(
        ilike(imbarcazioni.nome, like),
        ilike(imbarcazioni.hullNumber, like),
        ilike(imbarcazioni.modello, like)
      )
    )
    .limit(6);
  for (const i of imbRows) {
    items.push({
      kind: "imbarcazione",
      url: `/imbarcazioni/${i.id}`,
      primary: i.nome ?? i.hull ?? "(senza nome)",
      secondary: `${i.cantiere ?? ""} ${i.hull ? `· ${i.hull}` : ""} ${i.modello ? `· ${i.modello}` : ""}`,
    });
  }

  // Clienti
  const clRows = await db
    .select()
    .from(clienti)
    .where(or(ilike(clienti.ragioneSociale, like), ilike(clienti.nomeBreve, like)))
    .limit(5);
  for (const c of clRows) {
    items.push({
      kind: "cliente",
      url: `/clienti/${c.id}`,
      primary: c.ragioneSociale,
      secondary: c.tipo,
    });
  }

  return NextResponse.json({ items: items.slice(0, 16) });
}
