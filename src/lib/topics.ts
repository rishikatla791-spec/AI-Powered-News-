export const TOPICS = [
  { slug: "world", name: "World" },
  { slug: "india", name: "India" },
  { slug: "business", name: "Business" },
  { slug: "technology", name: "Technology" },
  { slug: "science", name: "Science" },
  { slug: "climate", name: "Climate" },
  { slug: "health", name: "Health" },
  { slug: "sport", name: "Sport" },
  { slug: "culture", name: "Culture" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];
export const TOPIC_SLUGS = TOPICS.map((t) => t.slug) as [TopicSlug, ...TopicSlug[]];

export function topicName(slug: string): string {
  return TOPICS.find((t) => t.slug === slug)?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

export const isTopic = (slug: string): slug is TopicSlug => TOPIC_SLUGS.includes(slug as TopicSlug);
