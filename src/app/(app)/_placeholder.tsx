import Link from "next/link";

export function ModuloInSviluppo({
  titolo,
  descrizione,
  slice,
}: {
  titolo: string;
  descrizione: string;
  slice: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{titolo}</h1>
      <div className="rounded-lg border bg-card p-8 text-center space-y-3">
        <div className="text-4xl">🛠️</div>
        <h2 className="text-lg font-semibold">Modulo in costruzione</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{descrizione}</p>
        <p className="text-xs text-muted-foreground">Slice di riferimento: {slice}</p>
        <div>
          <Link href="/" className="text-primary hover:underline text-sm">
            Torna alla dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
