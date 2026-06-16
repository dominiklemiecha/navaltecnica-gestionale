import Link from "next/link";
import { db } from "@db/client";
import { impianti, imbarcazioni, clienti } from "@db/schema/anagrafiche";
import { ilike, or, eq, asc, sql, count } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination, parsePagination } from "@/components/pagination";

export default async function ImpiantiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const tipo = sp.tipo;
  const like = q ? `%${q}%` : null;
  const { page, size, offset } = parsePagination(sp);

  const conditions: any[] = [];
  if (like) {
    conditions.push(
      or(
        ilike(impianti.serialNumber, like),
        ilike(impianti.modello, like),
        ilike(imbarcazioni.nome, like),
        ilike(imbarcazioni.hullNumber, like)
      )
    );
  }
  if (tipo) conditions.push(eq(impianti.tipo, tipo as any));

  const where = conditions.length ? (sql.join(conditions, sql` AND `) as any) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(impianti)
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, impianti.imbarcazioneId))
    .where(where);

  const rows = await db
    .select({
      id: impianti.id,
      tipo: impianti.tipo,
      modello: impianti.modello,
      sn: impianti.serialNumber,
      tensione: impianti.tensione,
      imb: imbarcazioni.nome,
      hull: imbarcazioni.hullNumber,
      cantiere: clienti.ragioneSociale,
      imbId: imbarcazioni.id,
    })
    .from(impianti)
    .leftJoin(imbarcazioni, eq(imbarcazioni.id, impianti.imbarcazioneId))
    .leftJoin(clienti, eq(clienti.id, imbarcazioni.cantiereCostruttoreId))
    .where(where)
    .orderBy(asc(impianti.tipo), asc(imbarcazioni.nome))
    .limit(size)
    .offset(offset);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Impianti installati</h1>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="SN, modello, barca, hull..." className="max-w-md" />
        <select
          name="tipo"
          defaultValue={tipo ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tutti i tipi</option>
          <option value="HAG_SEWAGE">Hamann (sewage)</option>
          <option value="DVZ_OWS">DVZ OWS</option>
          <option value="DVZ_STP">DVZ STP</option>
          <option value="DVZ_GT">DVZ Grease Trap</option>
          <option value="MATRIX">Matrix</option>
          <option value="AP_MARINE">AP Marine</option>
          <option value="BIO_SEA">BIO SEA</option>
          <option value="ALTRO">Altro</option>
        </select>
        <Button type="submit" variant="secondary">Cerca</Button>
      </form>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Modello</th>
              <th className="px-3 py-2">SN</th>
              <th className="px-3 py-2">Tensione</th>
              <th className="px-3 py-2">Imbarcazione</th>
              <th className="px-3 py-2">Cantiere</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">{r.tipo}</td>
                <td className="px-3 py-2">{r.modello ?? "—"}</td>
                <td className="px-3 py-2 font-mono">{r.sn ?? "—"}</td>
                <td className="px-3 py-2">{r.tensione ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.imbId ? (
                    <Link className="text-primary hover:underline" href={`/imbarcazioni/${r.imbId}`}>
                      {r.imb ?? r.hull ?? "(?)"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.cantiere ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun impianto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          size={size}
          total={Number(total)}
          basePath="/impianti"
          preserveParams={{ q, tipo }}
        />
      </div>
    </div>
  );
}
