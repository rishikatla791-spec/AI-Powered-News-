import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { askLogs, bookmarks, entities, follows, readEvents, stories, storyEntities, user, userSettings } from "@/lib/db/schema";
import { getStoriesByIds } from "./stories";

export async function getReaderState(userId: string) {
  const db = await getDb();
  const [f, b] = await Promise.all([
    db.select({ targetType: follows.targetType, targetSlug: follows.targetSlug, muted: follows.muted }).from(follows).where(eq(follows.userId, userId)),
    db.select({ storyId: bookmarks.storyId }).from(bookmarks).where(eq(bookmarks.userId, userId)),
  ]);
  return { follows: f, bookmarks: b.map((x) => x.storyId) };
}

export async function setFollow(userId: string, targetType: "topic" | "entity" | "source", targetSlug: string, on: boolean, muted = false) {
  const db = await getDb();
  if (!on) {
    await db.delete(follows).where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.targetSlug, targetSlug)));
    return;
  }
  await db
    .insert(follows)
    .values({ userId, targetType, targetSlug, muted })
    .onConflictDoUpdate({ target: [follows.userId, follows.targetType, follows.targetSlug], set: { muted } });
}

export async function setBookmark(userId: string, storyId: string, on: boolean) {
  const db = await getDb();
  if (on) await db.insert(bookmarks).values({ userId, storyId }).onConflictDoNothing();
  else await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.storyId, storyId)));
}

export async function getSaved(userId: string) {
  const db = await getDb();
  const rows = await db.select({ id: bookmarks.storyId }).from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
  return getStoriesByIds(rows.map((r) => r.id));
}

export async function recordRead(userId: string, storyId: string) {
  const db = await getDb();
  await db.insert(readEvents).values({ userId, storyId });
}

/** Stories from followed topics and entities in the last 48 hours, excluding ones already read. */
export async function getPersonalFeed(userId: string) {
  const db = await getDb();
  const f = await db.select().from(follows).where(and(eq(follows.userId, userId), eq(follows.muted, false)));
  const topicSlugs = f.filter((x) => x.targetType === "topic").map((x) => x.targetSlug);
  const entitySlugs = f.filter((x) => x.targetType === "entity").map((x) => x.targetSlug);
  if (!topicSlugs.length && !entitySlugs.length) return [];

  const recent = gt(stories.lastUpdatedAt, sql`now() - interval '48 hours'`);
  const byTopic = topicSlugs.length
    ? await db.select({ id: stories.id, importance: stories.importance }).from(stories).where(and(recent, inArray(stories.topicSlug, topicSlugs), gt(stories.outletCount, 1))).orderBy(desc(stories.importance)).limit(20)
    : [];
  const byEntity = entitySlugs.length
    ? await db
        .selectDistinct({ id: stories.id, importance: stories.importance })
        .from(storyEntities)
        .innerJoin(entities, eq(entities.id, storyEntities.entityId))
        .innerJoin(stories, eq(stories.id, storyEntities.storyId))
        .where(and(recent, inArray(entities.slug, entitySlugs)))
        .limit(20)
    : [];
  const read = await db
    .select({ id: readEvents.storyId })
    .from(readEvents)
    .where(and(eq(readEvents.userId, userId), gt(readEvents.at, sql`now() - interval '3 days'`)));
  const readSet = new Set(read.map((r) => r.id));
  const merged = new Map<string, number>();
  for (const s of byEntity) merged.set(s.id, s.importance * 1.4);
  for (const s of byTopic) merged.set(s.id, Math.max(merged.get(s.id) ?? 0, s.importance));
  const ids = [...merged.entries()]
    .filter(([id]) => !readSet.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);
  return getStoriesByIds(ids);
}

export async function getSettings(userId: string) {
  const db = await getDb();
  const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return s ?? { userId, briefEnabled: false, briefHour: 7, timezone: "Asia/Kolkata", lastBriefSentAt: null };
}

export async function updateSettings(userId: string, patch: { briefEnabled?: boolean; briefHour?: number; timezone?: string }) {
  const db = await getDb();
  await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });
}

export async function exportData(userId: string) {
  const db = await getDb();
  const [u] = await db.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.id, userId));
  const [f, b, r, a, s] = await Promise.all([
    db.select().from(follows).where(eq(follows.userId, userId)),
    db.select({ storyId: bookmarks.storyId, slug: stories.slug, headline: stories.headline, savedAt: bookmarks.createdAt }).from(bookmarks).innerJoin(stories, eq(stories.id, bookmarks.storyId)).where(eq(bookmarks.userId, userId)),
    db.select({ storyId: readEvents.storyId, at: readEvents.at }).from(readEvents).where(eq(readEvents.userId, userId)),
    db.select({ question: askLogs.question, answer: askLogs.answer, at: askLogs.at }).from(askLogs).where(eq(askLogs.userId, userId)),
    getSettings(userId),
  ]);
  return { exportedAt: new Date().toISOString(), account: u, settings: s, follows: f, savedStories: b, readingHistory: r, askHistory: a };
}

export async function clearHistory(userId: string) {
  const db = await getDb();
  await db.delete(readEvents).where(eq(readEvents.userId, userId));
  await db.delete(askLogs).where(eq(askLogs.userId, userId));
}

/** Deletes the account and everything linked to it (cascading foreign keys). */
export async function deleteAccount(userId: string) {
  const db = await getDb();
  await db.delete(user).where(eq(user.id, userId));
}
