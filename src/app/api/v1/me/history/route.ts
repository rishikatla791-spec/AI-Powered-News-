import { json, withUser } from "@/lib/http";
import { clearHistory } from "@/lib/services/reader";

export const DELETE = withUser(async (_req, { user }) => {
  await clearHistory(user.id);
  return json({ cleared: true });
});
