import { z } from "zod";
import { body, json, withUser } from "@/lib/http";
import { getSaved, setBookmark } from "@/lib/services/reader";

const schema = z.object({ storyId: z.uuid() });

export const GET = withUser(async (_req, { user }) => json({ stories: await getSaved(user.id) }));
export const POST = withUser(async (req, { user }) => {
  const { storyId } = await body(req, schema);
  await setBookmark(user.id, storyId, true);
  return json({ saved: true });
});
export const DELETE = withUser(async (req, { user }) => {
  const { storyId } = await body(req, schema);
  await setBookmark(user.id, storyId, false);
  return json({ saved: false });
});
