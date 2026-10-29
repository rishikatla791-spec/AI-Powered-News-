import { getAuth } from "@/lib/auth";
import { hasAuth } from "@/lib/env";
import { problem } from "@/lib/http";

async function handle(req: Request) {
  if (!hasAuth()) return problem(503, "Sign-in is not configured on this deployment yet.");
  const auth = await getAuth();
  return auth.handler(req);
}

export { handle as GET, handle as POST };
