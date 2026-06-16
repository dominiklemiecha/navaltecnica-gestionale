import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@db/client";
import { users } from "@db/schema/auth";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const parsed = loginSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.passwordHash || !user.attivo) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.nome ?? user.email,
          ruolo: user.ruolo,
        } as any;
      },
    }),
  ],
});

export type Ruolo =
  | "admin"
  | "amministrazione"
  | "tecnico_ufficio"
  | "tecnico_campo"
  | "responsabile_linea"
  | "solo_lettura";

export function canWrite(ruolo: Ruolo | undefined): boolean {
  return !!ruolo && ruolo !== "solo_lettura" && ruolo !== "tecnico_campo";
}
export function isAdmin(ruolo: Ruolo | undefined): boolean {
  return ruolo === "admin";
}
