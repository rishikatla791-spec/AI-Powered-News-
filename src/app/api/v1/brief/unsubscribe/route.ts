import { verifyUnsubscribe } from "@/lib/brief-token";
import { updateSettings } from "@/lib/services/reader";
import { siteUrl } from "@/lib/env";
import { wrap } from "@/lib/http";

/** One-click unsubscribe from the daily brief (link in every email; RFC 8058 POST supported). */
async function handle(req: Request) {
  return wrap(async () => {
    const url = new URL(req.url);
    const userId = verifyUnsubscribe(url.searchParams.get("u") ?? "", url.searchParams.get("t") ?? "");
    if (!userId) return Response.redirect(`${siteUrl()}/settings?brief=invalid`, 303);
    await updateSettings(userId, { briefEnabled: false });
    return req.method === "POST" ? new Response(null, { status: 204 }) : Response.redirect(`${siteUrl()}/settings?brief=off`, 303);
  });
}
export { handle as GET, handle as POST };
