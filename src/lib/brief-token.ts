import { createHmac, timingSafeEqual } from "node:crypto";
import { env, siteUrl } from "@/lib/env";

const sign = (userId: string) =>
  createHmac("sha256", env().BETTER_AUTH_SECRET ?? "dev-secret").update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);

export function unsubscribeUrl(userId: string) {
  return `${siteUrl()}/api/v1/brief/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

export function verifyUnsubscribe(userId: string, token: string): string | null {
  if (!userId || !token) return null;
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}
