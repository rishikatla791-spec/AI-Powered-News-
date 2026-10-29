export const SITE_TZ = "Asia/Kolkata";

export function timeAgo(date: Date | string | null | undefined, now = Date.now()): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  return formatDate(d);
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: SITE_TZ, ...opts }).format(new Date(d));
}

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: SITE_TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(d))
    .replace(" am", " a.m.")
    .replace(" pm", " p.m.");
}

export function formatDateTime(d: Date | string) {
  return `${formatDate(d, { day: "numeric", month: "short" })}, ${formatTime(d)} IST`;
}

export function editionDate(d = new Date()) {
  return formatDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
