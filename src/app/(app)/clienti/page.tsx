import Link from "next/link";
import { db } from "@db/client";
import { clienti } from "@db/schema/anagrafiche";
import { ilike, or, asc, sql, count } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, parsePagination } from "@/components/pagination";

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const tipo = sp.tipo;
  const { page, size, offset } = parsePagination(sp);

  const conditions = [];
  if (q) {
    const like = `%${q}%`;
    conditions.push(or(ilike(clienti.ragioneSociale, like), ilike(clienti.nomeBreve, like)));
  }
  if (tipo === "cantiere" || tipo === "bordo") {
    conditions.push(sql`${clienti.tipo} = ${tipo}`);
  }
  const where = conditions.length ? (sql.join(conditions, sql` AND `) as any) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(clienti).where(where);

  const rows = await db
    .select()
    .from(clienti)
    .where(where)
    .orderBy(asc(clienti.ragioneSociale))
    .limit(size)
    .offset(offset);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clienti</h1>
        <Button asChild>
          <Link href="/clienti/new">Nuovo cliente</Link>
        </Button>
      </div>
      <form className="flex gap-2 items-end">
        <div className="flex-1 max-w-md">
          <Input name="q" defaultValue={q} placeholder="Cerca ragione sociale o nome..." />
        </div>
        <select
          name="tipo"
          defaultValue={tipo ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tutti</option>
          <option value="cantiere">Cantiere</option>
          <option value="bordo">Bordo</option>
        </select>
        <Button type="submit" variant="secondary">Cerca</Button>
      </form>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Ragione sociale</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">P.IVA</th>
              <th className="px-3 py-2">Città</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{c.ragioneSociale}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs">{c.tipo}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.partitaIva ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.citta ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="text-primary hover:underline" href={`/clienti/${c.id}`}>
                    Apri
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun cliente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          size={size}
          total={Number(total)}
          basePath="/clienti"
          preserveParams={{ q, tipo }}
        />
      </div>
    </div>
  );
}
