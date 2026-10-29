import type { MetadataRoute } from "next";
import { desc, gt, sql } from "drizzle-orm";
import { siteUrl } from "@/lib/env";
import { TOPICS } from "@/lib/topics";
import { getDb } from "@/lib/db";
import { stories } from "@/lib/db/schema";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...["/search", "/ask", "/sources", "/methodology", "/about", "/contact", "/privacy", "/terms"].map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...TOPICS.map((t) => ({ url: `${base}/t/${t.slug}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 })),
  ];
  try {
    const db = await getDb();
    const rows = await db
      .select({ slug: stories.slug, updated: stories.lastUpdatedAt })
      .from(stories)
      .where(gt(stories.lastUpdatedAt, sql`now() - interval '7 days'`))
      .orderBy(desc(stories.lastUpdatedAt))
      .limit(500);
    pages.push(...rows.map((r) => ({ url: `${base}/s/${r.slug}`, lastModified: r.updated, changeFrequency: "hourly" as const, priority: 0.6 })));
  } catch {
    /* database not configured: static pages only */
  }
  return pages;
}
