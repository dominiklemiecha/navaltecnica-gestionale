import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navaltecnica — Gestionale",
  description: "Gestionale service & installazioni Navaltecnica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
