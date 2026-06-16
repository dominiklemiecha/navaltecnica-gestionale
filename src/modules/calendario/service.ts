export function startOfWeek(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay() || 7; // dom=0 → 7
  if (day !== 1) dt.setDate(dt.getDate() - (day - 1));
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function fmtDateInput(d: Date): string {
  // Data LOCALE (no UTC): toISOString convertirebbe in UTC e con offset positivo
  // (Italia) restituirebbe il giorno precedente, sfasando griglia e filtri.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const GIORNI = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"] as const;
