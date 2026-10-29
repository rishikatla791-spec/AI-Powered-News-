import { json, wrap } from "@/lib/http";
import { getLiveStats } from "@/lib/services/stories";

export const revalidate = 60;
export async function GET() {
  return wrap(async () => json(await getLiveStats()));
}
