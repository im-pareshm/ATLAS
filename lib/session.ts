import { auth } from "@/lib/auth";

/** Returns the signed-in user's id, or throws (routes are already gated by proxy). */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}
