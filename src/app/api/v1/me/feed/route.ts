import { json, withUser } from "@/lib/http";
import { getPersonalFeed } from "@/lib/services/reader";

export const dynamic = "force-dynamic";
export const GET = withUser(async (_req, { user }) => json({ stories: await getPersonalFeed(user.id) }));
