import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { clienti, imbarcazioni } from "@db/schema/anagrafiche";
import { eq, or, asc } from "drizzle-orm";

export default async function ClienteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await db.select().from(clienti).where(eq(clienti.id, id)).limit(1);
  if (!c) notFound();

  const barche = await db
    .select()
    .from(imbarcazioni)
    .where(or(eq(imbarcazioni.cantiereCostruttoreId, id), eq(imbarcazioni.proprietarioAttualeId, id)))
    .orderBy(asc(imbarcazioni.nome))
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clienti" className="text-sm text-muted-foreground hover:underline">
          ← Clienti
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{c.ragioneSociale}</h1>
        <div className="text-sm text-muted-foreground">
          {c.tipo} {c.partitaIva && `· P.IVA ${c.partitaIva}`}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Anagrafica</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Indirizzo</dt>
          <dd>{c.indirizzo ?? "—"}</dd>
          <dt className="text-muted-foreground">Città / CAP</dt>
          <dd>
            {c.citta ?? "—"} {c.cap}
          </dd>
          <dt className="text-muted-foreground">PEC</dt>
          <dd>{c.pec ?? "—"}</dd>
          <dt className="text-muted-foreground">Codice SDI</dt>
          <dd>{c.sdiCode ?? "—"}</dd>
          <dt className="text-muted-foreground">Termini pagamento</dt>
          <dd>{c.terminiPagamentoGiorni ? `${c.terminiPagamentoGiorni} gg` : "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Imbarcazioni ({barche.length})</h2>
        <ul className="text-sm divide-y">
          {barche.map((b) => (
            <li key={b.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="font-medium">{b.nome ?? "(senza nome)"}</span>{" "}
                <span className="text-muted-foreground">
                  {b.hullNumber && `· ${b.hullNumber}`} {b.modello && `· ${b.modello}`}
                </span>
              </span>
              <Link href={`/imbarcazioni/${b.id}`} className="text-primary hover:underline">
                Apri
              </Link>
            </li>
          ))}
          {barche.length === 0 && (
            <li className="py-4 text-muted-foreground">Nessuna imbarcazione associata.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
