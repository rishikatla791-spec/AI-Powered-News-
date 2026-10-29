import { withUser } from "@/lib/http";
import { exportData } from "@/lib/services/reader";

export const GET = withUser(async (_req, { user }) => {
  const data = await exportData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="lede-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
