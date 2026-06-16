import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@db/client";
import { imbarcazioni, impianti, clienti } from "@db/schema/anagrafiche";
import { pratiche } from "@db/schema/pratiche";
import { eq, desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function ImbarcazioneDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [b] = await db.select().from(imbarcazioni).where(eq(imbarcazioni.id, id)).limit(1);
  if (!b) notFound();

  const [cantiere] = b.cantiereCostruttoreId
    ? await db.select().from(clienti).where(eq(clienti.id, b.cantiereCostruttoreId)).limit(1)
    : [null];

  const imp = await db.select().from(impianti).where(eq(impianti.imbarcazioneId, id));
  const pra = await db
    .select()
    .from(pratiche)
    .where(eq(pratiche.imbarcazioneId, id))
    .orderBy(desc(pratiche.dataApertura))
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/imbarcazioni" className="text-sm text-muted-foreground hover:underline">
            ← Imbarcazioni
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{b.nome ?? "(senza nome)"}</h1>
          <div className="text-sm text-muted-foreground">
            {cantiere?.ragioneSociale} {b.hullNumber && `· ${b.hullNumber}`}{" "}
            {b.modello && `· ${b.modello}`}
          </div>
        </div>
        <Link
          href={`/pratiche/new?imbarcazioneId=${b.id}${
            b.cantiereCostruttoreId ? `&clienteId=${b.cantiereCostruttoreId}` : ""
          }`}
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:opacity-90"
        >
          + Nuova pratica per questa barca
        </Link>
      </div>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Dettagli</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Metri</dt>
          <dd>{b.metri ?? "—"}</dd>
          <dt className="text-muted-foreground">Anno costruzione</dt>
          <dd>{b.annoCostruzione ?? "—"}</dd>
          <dt className="text-muted-foreground">Armatore</dt>
          <dd>{b.armatore ?? "—"}</dd>
          <dt className="text-muted-foreground">Bandiera</dt>
          <dd>{b.bandiera ?? "—"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Impianti installati ({imp.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1">Tipo</th>
              <th>Modello</th>
              <th>Tensione</th>
              <th>SN</th>
              <th>Capacità</th>
              <th>Installato</th>
            </tr>
          </thead>
          <tbody>
            {imp.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="py-2">{i.tipo}</td>
                <td>{i.modello ?? "—"}</td>
                <td>{i.tensione ?? "—"}</td>
                <td>{i.serialNumber ?? "—"}</td>
                <td>{i.capacita ?? "—"}</td>
                <td>{formatDate(i.dataInstallazione)}</td>
              </tr>
            ))}
            {imp.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-muted-foreground">
                  Nessun impianto registrato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-3">Storico pratiche ({pra.length})</h2>
        <ul className="text-sm divide-y">
          {pra.map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <span>
                <span className="font-medium">{p.codice}</span>
                <span className="text-muted-foreground"> · {p.tipoLavoro ?? "—"} · {p.stato}</span>
              </span>
              <span className="text-muted-foreground">{formatDate(p.dataApertura)}</span>
            </li>
          ))}
          {pra.length === 0 && <li className="py-3 text-muted-foreground">Nessuna pratica.</li>}
        </ul>
      </section>
    </div>
  );
}
