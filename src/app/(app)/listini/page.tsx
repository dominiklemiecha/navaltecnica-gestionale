import Link from "next/link";
import { db } from "@db/client";
import { listiniCantiere, listiniRighe, listiniScafoPersonalizzati } from "@db/schema/listini";
import { clienti } from "@db/schema/anagrafiche";
import { eq, sql, asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function ListiniPage() {
  const rows = await db
    .select({
      id: listiniCantiere.id,
      nome: listiniCantiere.nome,
      cantiere: clienti.ragioneSociale,
      validoDa: listiniCantiere.validoDa,
      validoA: listiniCantiere.validoA,
      righe: sql<number>`(SELECT count(*)::int FROM ${listiniRighe} WHERE ${listiniRighe.listinoId} = ${listiniCantiere.id})`,
      scafi: sql<number>`(SELECT count(DISTINCT hull_number)::int FROM ${listiniScafoPersonalizzati} WHERE ${listiniScafoPersonalizzati.listinoId} = ${listiniCantiere.id})`,
    })
    .from(listiniCantiere)
    .leftJoin(clienti, eq(clienti.id, listiniCantiere.cantiereId))
    .orderBy(asc(clienti.ragioneSociale));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Listini cantiere</h1>
        <Button asChild>
          <Link href="/listini/new">Nuovo listino</Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Cantiere</th>
              <th className="px-3 py-2">Nome listino</th>
              <th className="px-3 py-2">Validità</th>
              <th className="px-3 py-2 text-right">Articoli</th>
              <th className="px-3 py-2 text-right">Scafi</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{l.cantiere ?? "—"}</td>
                <td className="px-3 py-2">{l.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDate(l.validoDa)} {l.validoA && `→ ${formatDate(l.validoA)}`}
                </td>
                <td className="px-3 py-2 text-right">{l.righe}</td>
                <td className="px-3 py-2 text-right">{l.scafi}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="text-primary hover:underline" href={`/listini/${l.id}`}>
                    Apri
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun listino.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
