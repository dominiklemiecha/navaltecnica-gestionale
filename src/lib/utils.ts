import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatEur(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
