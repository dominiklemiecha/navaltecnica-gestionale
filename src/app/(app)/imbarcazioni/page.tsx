import Link from "next/link";
import { db } from "@db/client";
import { imbarcazioni, clienti } from "@db/schema/anagrafiche";
import { ilike, or, asc, eq, sql, count } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination, parsePagination } from "@/components/pagination";

export default async function ImbarcazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const like = q ? `%${q}%` : null;
  const { page, size, offset } = parsePagination(sp);

  const where = like
    ? (or(
        ilike(imbarcazioni.nome, like),
        ilike(imbarcazioni.hullNumber, like),
        ilike(imbarcazioni.modello, like),
        ilike(clienti.ragioneSociale, like)
      ) as any)
    : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(imbarcazioni)
    .leftJoin(clienti, eq(clienti.id, imbarcazioni.cantiereCostruttoreId))
    .where(where);

  const rows = await db
    .select({
      id: imbarcazioni.id,
      nome: imbarcazioni.nome,
      hullNumber: imbarcazioni.hullNumber,
      modello: imbarcazioni.modello,
      metri: imbarcazioni.metri,
      cantiere: clienti.ragioneSociale,
    })
    .from(imbarcazioni)
    .leftJoin(clienti, eq(clienti.id, imbarcazioni.cantiereCostruttoreId))
    .where(where)
    .orderBy(asc(imbarcazioni.nome))
    .limit(size)
    .offset(offset);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Imbarcazioni</h1>
        <Button asChild>
          <Link href="/imbarcazioni/new">Nuova imbarcazione</Link>
        </Button>
      </div>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Nome, hull, modello, cantiere..." className="max-w-md" />
        <Button type="submit" variant="secondary">Cerca</Button>
      </form>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Cantiere</th>
              <th className="px-3 py-2">Hull</th>
              <th className="px-3 py-2">Modello</th>
              <th className="px-3 py-2">Metri</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{b.nome ?? "(senza nome)"}</td>
                <td className="px-3 py-2 text-muted-foreground">{b.cantiere ?? "—"}</td>
                <td className="px-3 py-2">{b.hullNumber ?? "—"}</td>
                <td className="px-3 py-2">{b.modello ?? "—"}</td>
                <td className="px-3 py-2">{b.metri ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="text-primary hover:underline" href={`/imbarcazioni/${b.id}`}>
                    Apri
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Nessuna imbarcazione.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          size={size}
          total={Number(total)}
          basePath="/imbarcazioni"
          preserveParams={{ q }}
        />
      </div>
    </div>
  );
}
