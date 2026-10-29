/**
 * Seed list of public news feeds. Each feed is polled politely (ETag /
 * If-Modified-Since, one request per run). Feed health is recorded on every
 * run and shown on /sources and /admin — a feed that breaks is visible, not hidden.
 *
 * We store and display only the headline, byline, a short excerpt and a link
 * to the publisher. Article bodies are never republished.
 */
export type SeedSource = {
  name: string;
  slug: string;
  homepage: string;
  feedUrl: string;
  type?: "rss" | "guardian" | "nyt";
  country: string;
  topic: string;
};

export const SEED_SOURCES: SeedSource[] = [
  // India
  { name: "The Hindu", slug: "the-hindu", homepage: "https://www.thehindu.com", feedUrl: "https://www.thehindu.com/news/national/feeder/default.rss", country: "IN", topic: "india" },
  { name: "The Hindu BusinessLine", slug: "the-hindu-business", homepage: "https://www.thehindu.com/business", feedUrl: "https://www.thehindu.com/business/feeder/default.rss", country: "IN", topic: "business" },
  { name: "The Indian Express", slug: "indian-express", homepage: "https://indianexpress.com", feedUrl: "https://indianexpress.com/section/india/feed/", country: "IN", topic: "india" },
  { name: "Indian Express Tech", slug: "indian-express-tech", homepage: "https://indianexpress.com/section/technology/", feedUrl: "https://indianexpress.com/section/technology/feed/", country: "IN", topic: "technology" },
  { name: "Hindustan Times", slug: "hindustan-times", homepage: "https://www.hindustantimes.com", feedUrl: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", country: "IN", topic: "india" },
  { name: "Mint", slug: "mint", homepage: "https://www.livemint.com", feedUrl: "https://www.livemint.com/rss/news", country: "IN", topic: "business" },
  { name: "The Economic Times", slug: "economic-times", homepage: "https://economictimes.indiatimes.com", feedUrl: "https://economictimes.indiatimes.com/rssfeedstopstories.cms", country: "IN", topic: "business" },
  { name: "NDTV", slug: "ndtv", homepage: "https://www.ndtv.com", feedUrl: "https://feeds.feedburner.com/ndtvnews-top-stories", country: "IN", topic: "india" },
  { name: "Scroll", slug: "scroll", homepage: "https://scroll.in", feedUrl: "https://feeds.feedburner.com/ScrollinArticles.rss", country: "IN", topic: "india" },
  { name: "BBC News India", slug: "bbc-india", homepage: "https://www.bbc.com/news/world/asia/india", feedUrl: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml", country: "GB", topic: "india" },
  { name: "ESPNcricinfo", slug: "espncricinfo", homepage: "https://www.espncricinfo.com", feedUrl: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", country: "IN", topic: "sport" },

  // World
  { name: "BBC News", slug: "bbc-world", homepage: "https://www.bbc.com/news/world", feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", country: "GB", topic: "world" },
  { name: "Al Jazeera", slug: "al-jazeera", homepage: "https://www.aljazeera.com", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml", country: "QA", topic: "world" },
  { name: "NPR", slug: "npr", homepage: "https://www.npr.org", feedUrl: "https://feeds.npr.org/1004/rss.xml", country: "US", topic: "world" },
  { name: "DW", slug: "dw", homepage: "https://www.dw.com/en", feedUrl: "https://rss.dw.com/rdf/rss-en-all", country: "DE", topic: "world" },
  { name: "France 24", slug: "france-24", homepage: "https://www.france24.com/en/", feedUrl: "https://www.france24.com/en/rss", country: "FR", topic: "world" },
  { name: "The New York Times", slug: "nyt-world", homepage: "https://www.nytimes.com/section/world", feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", country: "US", topic: "world" },
  { name: "The Guardian", slug: "guardian-world", homepage: "https://www.theguardian.com/world", feedUrl: "https://www.theguardian.com/world/rss", country: "GB", topic: "world" },

  // Business
  { name: "BBC Business", slug: "bbc-business", homepage: "https://www.bbc.com/news/business", feedUrl: "https://feeds.bbci.co.uk/news/business/rss.xml", country: "GB", topic: "business" },
  { name: "CNBC", slug: "cnbc", homepage: "https://www.cnbc.com", feedUrl: "https://www.cnbc.com/id/100003114/device/rss/rss.html", country: "US", topic: "business" },
  { name: "The Guardian Business", slug: "guardian-business", homepage: "https://www.theguardian.com/business", feedUrl: "https://www.theguardian.com/business/rss", country: "GB", topic: "business" },

  // Technology
  { name: "Ars Technica", slug: "ars-technica", homepage: "https://arstechnica.com", feedUrl: "https://feeds.arstechnica.com/arstechnica/index", country: "US", topic: "technology" },
  { name: "The Verge", slug: "the-verge", homepage: "https://www.theverge.com", feedUrl: "https://www.theverge.com/rss/index.xml", country: "US", topic: "technology" },
  { name: "TechCrunch", slug: "techcrunch", homepage: "https://techcrunch.com", feedUrl: "https://techcrunch.com/feed/", country: "US", topic: "technology" },
  { name: "Wired", slug: "wired", homepage: "https://www.wired.com", feedUrl: "https://www.wired.com/feed/rss", country: "US", topic: "technology" },
  { name: "BBC Technology", slug: "bbc-technology", homepage: "https://www.bbc.com/news/technology", feedUrl: "https://feeds.bbci.co.uk/news/technology/rss.xml", country: "GB", topic: "technology" },
  { name: "The Guardian Technology", slug: "guardian-technology", homepage: "https://www.theguardian.com/technology", feedUrl: "https://www.theguardian.com/technology/rss", country: "GB", topic: "technology" },

  // Science
  { name: "Nature", slug: "nature", homepage: "https://www.nature.com", feedUrl: "https://www.nature.com/nature.rss", country: "GB", topic: "science" },
  { name: "ScienceDaily", slug: "sciencedaily", homepage: "https://www.sciencedaily.com", feedUrl: "https://www.sciencedaily.com/rss/top/science.xml", country: "US", topic: "science" },
  { name: "NASA", slug: "nasa", homepage: "https://www.nasa.gov", feedUrl: "https://www.nasa.gov/news-release/feed/", country: "US", topic: "science" },
  { name: "BBC Science", slug: "bbc-science", homepage: "https://www.bbc.com/news/science_and_environment", feedUrl: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", country: "GB", topic: "science" },
  { name: "The Guardian Science", slug: "guardian-science", homepage: "https://www.theguardian.com/science", feedUrl: "https://www.theguardian.com/science/rss", country: "GB", topic: "science" },

  // Climate
  { name: "Carbon Brief", slug: "carbon-brief", homepage: "https://www.carbonbrief.org", feedUrl: "https://www.carbonbrief.org/feed/", country: "GB", topic: "climate" },
  { name: "Inside Climate News", slug: "inside-climate-news", homepage: "https://insideclimatenews.org", feedUrl: "https://insideclimatenews.org/feed/", country: "US", topic: "climate" },
  { name: "The Guardian Environment", slug: "guardian-environment", homepage: "https://www.theguardian.com/environment", feedUrl: "https://www.theguardian.com/environment/rss", country: "GB", topic: "climate" },

  // Health
  { name: "BBC Health", slug: "bbc-health", homepage: "https://www.bbc.com/news/health", feedUrl: "https://feeds.bbci.co.uk/news/health/rss.xml", country: "GB", topic: "health" },
  { name: "STAT", slug: "stat", homepage: "https://www.statnews.com", feedUrl: "https://www.statnews.com/feed/", country: "US", topic: "health" },
  { name: "World Health Organization", slug: "who", homepage: "https://www.who.int", feedUrl: "https://www.who.int/rss-feeds/news-english.xml", country: "INT", topic: "health" },

  // Sport
  { name: "BBC Sport", slug: "bbc-sport", homepage: "https://www.bbc.com/sport", feedUrl: "https://feeds.bbci.co.uk/sport/rss.xml", country: "GB", topic: "sport" },
  { name: "The Guardian Sport", slug: "guardian-sport", homepage: "https://www.theguardian.com/sport", feedUrl: "https://www.theguardian.com/sport/rss", country: "GB", topic: "sport" },

  // Culture
  { name: "The Guardian Culture", slug: "guardian-culture", homepage: "https://www.theguardian.com/culture", feedUrl: "https://www.theguardian.com/culture/rss", country: "GB", topic: "culture" },
  { name: "NPR Arts", slug: "npr-arts", homepage: "https://www.npr.org/sections/arts/", feedUrl: "https://feeds.npr.org/1008/rss.xml", country: "US", topic: "culture" },

  // Keyed APIs (used only when a free key is configured)
  { name: "The Guardian (API)", slug: "guardian-api", homepage: "https://www.theguardian.com", feedUrl: "world|business|technology|science|environment|global-development", type: "guardian", country: "GB", topic: "world" },
  { name: "The New York Times (API)", slug: "nyt-api", homepage: "https://www.nytimes.com", feedUrl: "home", type: "nyt", country: "US", topic: "world" },
];
