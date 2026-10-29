import { getSessionUser } from "@/lib/auth";
import { hasAuth, hasGoogleAuth } from "@/lib/env";
import { json, wrap, withUser } from "@/lib/http";
import { deleteAccount, getReaderState } from "@/lib/services/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  return wrap(async () => {
    const base = { authAvailable: hasAuth(), googleAvailable: hasGoogleAuth() };
    const user = await getSessionUser();
    if (!user) return json({ ...base, user: null, follows: [], bookmarks: [] });
    const state = await getReaderState(user.id);
    return json({ ...base, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }, ...state });
  });
}

export const DELETE = withUser(async (_req, { user }) => {
  await deleteAccount(user.id);
  return json({ deleted: true });
});
