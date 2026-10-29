import Parser from "rss-parser";
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { articles, sourceHealth, sources, type Source } from "@/lib/db/schema";
import { env, siteUrl } from "@/lib/env";
import { createHash } from "node:crypto";
import { canonicalUrl, readingTime, stripHtml, truncate } from "@/lib/text";

export function titleHash(title: string): string {
  const norm = title.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  return createHash("sha1").update(norm).digest("hex").slice(0, 20);
}
import { isTopic } from "@/lib/topics";

export type Candidate = {
  url: string;
  title: string;
  excerpt: string;
  content?: string;
  byline?: string;
  imageUrl?: string;
  publishedAt: Date;
  topicSlug?: string;
};

const MAX_AGE_MS = 48 * 3600 * 1000;
const MAX_PER_FEED = 60;

type MediaNode = { $?: { url?: string; medium?: string; type?: string; width?: string } };
type FeedItem = Parser.Item & {
  creator?: string;
  author?: string;
  mediaContent?: MediaNode[];
  mediaThumbnail?: MediaNode | MediaNode[];
  "content:encoded"?: string;
};

const parser: Parser<object, FeedItem> = new Parser({
  timeout: 15_000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"],
      ["dc:creator", "creator"],
    ],
  },
});

const userAgent = () => `LedeBot/1.0 (+${siteUrl()}/methodology)`;

function pickImage(item: FeedItem): string | undefined {
  const fromMedia = item.mediaContent
    ?.filter((m) => m.$?.url && (!m.$.medium || m.$.medium === "image") && !/\.(mp4|mp3)$/i.test(m.$.url ?? ""))
    .sort((a, b) => Number(b.$?.width ?? 0) - Number(a.$?.width ?? 0))[0]?.$?.url;
  if (fromMedia) return fromMedia;
  const thumb = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail[0] : item.mediaThumbnail;
  if (thumb?.$?.url) return thumb.$.url;
  if (item.enclosure?.url && /image/i.test(item.enclosure.type ?? "image")) return item.enclosure.url;
  const html = item["content:encoded"] ?? item.content ?? "";
  return /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1];
}

export function parseFeedItems(items: FeedItem[], now = Date.now()): Candidate[] {
  const out: Candidate[] = [];
  for (const item of items.slice(0, MAX_PER_FEED)) {
    const url = item.link?.trim();
    const title = stripHtml(item.title);
    if (!url || !title || title.length < 12) continue;
    const date = new Date(item.isoDate ?? item.pubDate ?? now);
    const publishedAt = Number.isNaN(date.getTime()) || date.getTime() > now + 3600_000 ? new Date(now) : date;
    if (now - publishedAt.getTime() > MAX_AGE_MS) continue;
    const excerpt = truncate(stripHtml(item.contentSnippet ?? item.summary ?? item.content), 420);
    out.push({
      url,
      title,
      excerpt,
      byline: stripHtml(item.creator ?? item.author) || undefined,
      imageUrl: pickImage(item),
      publishedAt,
    });
  }
  return out;
}

async function fetchRss(source: Source): Promise<FetchResult> {
  const headers: Record<string, string> = { "user-agent": userAgent(), accept: "application/rss+xml, application/xml, text/xml, */*" };
  if (source.etag) headers["if-none-match"] = source.etag;
  if (source.lastModified) headers["if-modified-since"] = source.lastModified;
  const res = await fetch(source.feedUrl, { headers, signal: AbortSignal.timeout(15_000), redirect: "follow" });
  if (res.status === 304) return { items: [], notModified: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const feed = await parser.parseString(xml);
  return {
    items: parseFeedItems(feed.items),
    etag: res.headers.get("etag") ?? undefined,
    lastModified: res.headers.get("last-modified") ?? undefined,
  };
}

const GUARDIAN_TOPIC: Record<string, string> = {
  world: "world",
  business: "business",
  technology: "technology",
  science: "science",
  environment: "climate",
  "global-development": "world",
  sport: "sport",
  culture: "culture",
};

type FetchResult = { items: Candidate[]; etag?: string; lastModified?: string; notModified?: boolean };

async function fetchGuardian(source: Source): Promise<FetchResult> {
  const key = env().GUARDIAN_API_KEY;
  if (!key) throw new SkipError("no GUARDIAN_API_KEY");
  const url = new URL("https://content.guardianapis.com/search");
  url.searchParams.set("section", source.feedUrl);
  url.searchParams.set("show-fields", "trailText,byline,thumbnail,bodyText");
  url.searchParams.set("page-size", "50");
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("api-key", key);
  const res = await fetch(url, { headers: { "user-agent": userAgent() }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    response: {
      results: {
        webUrl: string;
        webTitle: string;
        webPublicationDate: string;
        sectionId: string;
        fields?: { trailText?: string; byline?: string; thumbnail?: string; bodyText?: string };
      }[];
    };
  };
  const now = Date.now();
  return {
    items: json.response.results
      .map((r) => ({
        url: r.webUrl,
        title: stripHtml(r.webTitle),
        excerpt: truncate(stripHtml(r.fields?.trailText), 420),
        // Body text is used only as input for summaries; it is never displayed.
        content: r.fields?.bodyText ? r.fields.bodyText.slice(0, 2000) : undefined,
        byline: r.fields?.byline,
        imageUrl: r.fields?.thumbnail,
        publishedAt: new Date(r.webPublicationDate),
        topicSlug: GUARDIAN_TOPIC[r.sectionId],
      }))
      .filter((c) => now - c.publishedAt.getTime() < MAX_AGE_MS),
  };
}

const NYT_TOPIC: Record<string, string> = {
  world: "world",
  us: "world",
  business: "business",
  technology: "technology",
  science: "science",
  climate: "climate",
  health: "health",
  sports: "sport",
  arts: "culture",
  books: "culture",
  movies: "culture",
  theater: "culture",
};

async function fetchNyt(source: Source): Promise<FetchResult> {
  const key = env().NYT_API_KEY;
  if (!key) throw new SkipError("no NYT_API_KEY");
  const res = await fetch(`https://api.nytimes.com/svc/topstories/v2/${source.feedUrl}.json?api-key=${key}`, {
    headers: { "user-agent": userAgent() },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    results: {
      title: string;
      abstract: string;
      url: string;
      byline: string;
      published_date: string;
      section: string;
      multimedia?: { url: string; width: number }[] | null;
    }[];
  };
  const now = Date.now();
  return {
    items: json.results
      .filter((r) => r.url && r.title)
      .map((r) => ({
        url: r.url,
        title: r.title,
        excerpt: truncate(r.abstract ?? "", 420),
        byline: r.byline?.replace(/^By\s+/i, "") || undefined,
        imageUrl: [...(r.multimedia ?? [])].sort((a, b) => b.width - a.width)[0]?.url,
        publishedAt: new Date(r.published_date),
        topicSlug: NYT_TOPIC[r.section],
      }))
      .filter((c) => now - c.publishedAt.getTime() < MAX_AGE_MS),
  };
}

export class SkipError extends Error {}

export async function storeCandidates(db: Db, source: Source, items: Candidate[]): Promise<number> {
  if (items.length === 0) return 0;
  const seen = new Set<string>();
  const rows = [];
  for (const c of items) {
    const canonical = canonicalUrl(c.url);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const words = (c.content ?? c.excerpt).split(/\s+/).length;
    rows.push({
      sourceId: source.id,
      url: c.url,
      canonicalUrl: canonical,
      title: c.title,
      byline: c.byline ? c.byline.slice(0, 160) : null,
      excerpt: c.excerpt || null,
      content: c.content ?? null,
      imageUrl: c.imageUrl?.startsWith("http") ? c.imageUrl.replace(/^http:/, "https:") : null,
      publishedAt: c.publishedAt,
      contentHash: titleHash(c.title),
      readingTimeMin: c.content ? readingTime(words) : null,
      topicSlug: c.topicSlug && isTopic(c.topicSlug) ? c.topicSlug : source.defaultTopic,
    });
  }
  const inserted = await db
    .insert(articles)
    .values(rows)
    .onConflictDoNothing({ target: articles.canonicalUrl })
    .returning({ id: articles.id });
  return inserted.length;
}

export async function fetchSource(db: Db, source: Source): Promise<{ inserted: number; status: string }> {
  let status = "ok";
  let inserted = 0;
  let error: string | null = null;
  try {
    const result: FetchResult =
      source.type === "guardian" ? await fetchGuardian(source) : source.type === "nyt" ? await fetchNyt(source) : await fetchRss(source);
    if (result.notModified) status = "not-modified";
    inserted = await storeCandidates(db, source, result.items);
    if (result.etag || result.lastModified) {
      await db
        .update(sources)
        .set({ etag: result.etag ?? null, lastModified: result.lastModified ?? null })
        .where(eq(sources.id, source.id));
    }
  } catch (err) {
    if (err instanceof SkipError) {
      status = "skipped";
      error = err.message;
    } else {
      status = "error";
      error = String((err as Error)?.message ?? err).slice(0, 300);
    }
  }
  const failed = status === "error" ? 1 : 0;
  await db
    .insert(sourceHealth)
    .values({
      sourceId: source.id,
      lastFetchAt: new Date(),
      lastStatus: status,
      lastError: error,
      fetches7d: 1,
      failures7d: failed,
      articlesTotal: inserted,
    })
    .onConflictDoUpdate({
      target: sourceHealth.sourceId,
      set: {
        lastFetchAt: new Date(),
        lastStatus: status,
        lastError: error,
        fetches7d: sql`${sourceHealth.fetches7d} + 1`,
        failures7d: sql`${sourceHealth.failures7d} + ${failed}`,
        articlesTotal: sql`${sourceHealth.articlesTotal} + ${inserted}`,
      },
    });
  return { inserted, status };
}
