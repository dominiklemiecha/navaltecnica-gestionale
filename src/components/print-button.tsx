"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-sm rounded bg-primary text-primary-foreground px-3 py-1.5 hover:opacity-90"
    >
      🖨 Stampa / Salva PDF
    </button>
  );
}
