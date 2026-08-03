import type { NextAuthConfig } from "next-auth";

// Edge-safe base config: NO Prisma / bcrypt imports here, so it can be used by
// middleware (edge runtime). The Credentials provider (Node-only) is added in
// lib/auth.ts. This is the standard Auth.js v5 split-config pattern.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  // Trust the deployment host header (Vercel/other) for callback URLs.
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const onLogin = nextUrl.pathname.startsWith("/login");
      if (onLogin) {
        // Already logged in? bounce to dashboard. Otherwise allow the login page.
        return loggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      // Everything else requires a session.
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
