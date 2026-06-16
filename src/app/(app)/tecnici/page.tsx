import Link from "next/link";
import { db } from "@db/client";
import { tecnici, sedi } from "@db/schema/anagrafiche";
import { asc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";

export default async function TecniciPage() {
  const rows = await db
    .select({
      id: tecnici.id,
      nome: tecnici.nome,
      cognome: tecnici.cognome,
      ruolo: tecnici.ruolo,
      sede: sedi.nome,
      email: tecnici.email,
      telefono: tecnici.telefono,
      attivo: tecnici.attivo,
    })
    .from(tecnici)
    .leftJoin(sedi, eq(sedi.id, tecnici.sedeId))
    .orderBy(asc(tecnici.nome));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tecnici</h1>
        <Button asChild>
          <Link href="/tecnici/new">Nuovo tecnico</Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Ruolo</th>
              <th className="px-3 py-2">Sede</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Telefono</th>
              <th className="px-3 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 font-medium">
                  {t.nome} {t.cognome}
                </td>
                <td className="px-3 py-2">{t.ruolo}</td>
                <td className="px-3 py-2">{t.sede ?? "—"}</td>
                <td className="px-3 py-2">{t.email ?? "—"}</td>
                <td className="px-3 py-2">{t.telefono ?? "—"}</td>
                <td className="px-3 py-2">
                  {t.attivo ? (
                    <span className="text-green-700">attivo</span>
                  ) : (
                    <span className="text-muted-foreground">inattivo</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Nessun tecnico.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
