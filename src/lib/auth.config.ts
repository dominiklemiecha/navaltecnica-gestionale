import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config (no DB, no pg).
 * Usato da middleware. Lo split serve perché Next middleware gira in Edge runtime.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) return true;
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        token.ruolo = (user as any).ruolo;
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).ruolo = token.ruolo;
        (session.user as any).id = token.uid;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
