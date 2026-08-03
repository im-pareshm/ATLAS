import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next 16 renamed the "middleware" convention to "proxy". Edge-safe: authConfig has
// no Node-only deps. The `authorized` callback gates every matched route and
// redirects logged-in users away from /login.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
