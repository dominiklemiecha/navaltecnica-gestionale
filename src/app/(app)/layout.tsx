import Link from "next/link";
import { unstable_cache } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@db/client";
import { pratiche } from "@db/schema/pratiche";
import { preventivi } from "@db/schema/preventivi";
import { fatture } from "@db/schema/fatturazione";
import { assegnazioniIntervento } from "@db/schema/pianificazione";
import { and, count, eq, gte, isNull, isNotNull, lt, sql } from "drizzle-orm";
import {
  LayoutDashboard,
  Users,
  Ship,
  Settings2,
  ClipboardList,
  FileText,
  Tag,
  CalendarRange,
  Package,
  ReceiptText,
  HardHat,
  LogOut,
} from "lucide-react";
import { GlobalSearch } from "@/components/global-search";

const getBadges = unstable_cache(
  async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [r] = await db
      .select({
        pratAttive: sql<number>`(SELECT count(*)::int FROM ${pratiche} WHERE stato NOT IN ('chiusa','annullata'))`,
        prevDaInviare: sql<number>`(SELECT count(*)::int FROM ${preventivi} WHERE data_invio IS NULL)`,
        interventiOggi: sql<number>`(SELECT count(*)::int FROM ${assegnazioniIntervento} WHERE data = ${today})`,
        fattInsolute: sql<number>`(SELECT count(*)::int FROM ${fatture} WHERE stato = 'insoluta')`,
      })
      .from(sql`(SELECT 1) AS dummy`);
    return r;
  },
  ["layout-badges"],
  { revalidate: 30, tags: ["badges"] }
);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  const b = await getBadges();

  const nav: Array<{ href: string; label: string; icon: any; badge?: number; badgeColor?: string }> = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pratiche", label: "Pratiche", icon: ClipboardList, badge: b.pratAttive },
    { href: "/preventivi", label: "Preventivi", icon: FileText, badge: b.prevDaInviare, badgeColor: "bg-amber-100 text-amber-900" },
    { href: "/calendario", label: "Calendario", icon: CalendarRange, badge: b.interventiOggi, badgeColor: "bg-indigo-100 text-indigo-900" },
    { href: "/clienti", label: "Clienti", icon: Users },
    { href: "/imbarcazioni", label: "Imbarcazioni", icon: Ship },
    { href: "/impianti", label: "Impianti", icon: Settings2 },
    { href: "/tecnici", label: "Tecnici", icon: HardHat },
    { href: "/listini", label: "Listini", icon: Tag },
    { href: "/ordini", label: "Ordini & Magazzino", icon: Package },
    { href: "/fatture", label: "Fatture", icon: ReceiptText, badge: b.fattInsolute, badgeColor: "bg-rose-100 text-rose-900" },
  ];

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      {/* Sidebar mobile drawer trigger via input checkbox */}
      <input id="sb" type="checkbox" className="hidden peer" />
      <label
        htmlFor="sb"
        className="md:hidden fixed inset-0 bg-black/30 z-20 hidden peer-checked:block"
      />

      <aside className="border-r bg-card md:sticky md:top-0 md:h-screen md:flex md:flex-col fixed inset-y-0 left-0 z-30 w-60 -translate-x-full peer-checked:translate-x-0 md:translate-x-0 transition-transform">
        <div className="p-4 border-b">
          <div className="font-semibold">Navaltecnica</div>
          <div className="text-xs text-muted-foreground">Gestionale Service</div>
        </div>
        <nav className="p-2 space-y-0.5 text-sm flex-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                      item.badgeColor ?? "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b px-4 md:px-6 h-14 bg-card gap-3">
          <label htmlFor="sb" className="md:hidden cursor-pointer p-2 -ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </label>
          <GlobalSearch />
          <form action={logout} className="ml-auto">
            <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6 min-w-0 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
