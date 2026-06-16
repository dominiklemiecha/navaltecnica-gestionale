"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ClipboardList, Ship, Users, Loader2 } from "lucide-react";

type Item = {
  kind: "pratica" | "imbarcazione" | "cliente";
  url: string;
  primary: string;
  secondary: string;
};

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // shortcut Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        setItems(data.items ?? []);
        setHi(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" && items[hi]) {
      e.preventDefault();
      router.push(items[hi].url);
      setOpen(false);
      setQ("");
    }
  }

  return (
    <div ref={wrapRef} className="relative w-80">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Cerca pratica, barca, cliente... (Ctrl+K)"
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        <kbd className="absolute right-2 top-1.5 text-[10px] text-muted-foreground border rounded px-1 py-0.5 hidden sm:block">
          ⌘K
        </kbd>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-lg z-50 overflow-hidden">
          {items.length === 0 && !loading && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Nessun risultato</div>
          )}
          {items.map((it, idx) => {
            const Icon =
              it.kind === "pratica" ? ClipboardList : it.kind === "imbarcazione" ? Ship : Users;
            return (
              <button
                key={it.url + idx}
                onClick={() => {
                  router.push(it.url);
                  setOpen(false);
                  setQ("");
                }}
                onMouseEnter={() => setHi(idx)}
                className={`flex items-start gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                  hi === idx ? "bg-accent" : ""
                }`}
              >
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{it.primary}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.secondary}</div>
                </div>
                <span className="text-[10px] text-muted-foreground rounded bg-secondary px-1.5 py-0.5">
                  {it.kind}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
