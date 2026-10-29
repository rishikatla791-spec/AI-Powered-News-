"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { formatTime, formatDate } from "@/lib/format";

type Report = { id: string; outlet: string; publishedAt: string; title: string };

/**
 * How the story spread: every report placed on a time axis, outlets stacked by
 * order of arrival. On load the marks appear in the order they were published,
 * the page's one orchestrated moment, replaying how coverage grew.
 */
export function CoverageSpread({ reports, onSelect }: { reports: Report[]; onSelect?: (id: string) => void }) {
  const [hover, setHover] = useState<Report | null>(null);

  const data = useMemo(() => {
    const sorted = [...reports].sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt));
    const t0 = sorted[0] ? +new Date(sorted[0].publishedAt) : 0;
    const last = sorted.at(-1);
    const t1 = Math.max(last ? +new Date(last.publishedAt) : 0, t0 + 3600_000);
    const outlets: string[] = [];
    for (const r of sorted) if (!outlets.includes(r.outlet)) outlets.push(r.outlet);
    return { sorted, t0, t1, outlets };
  }, [reports]);

  const W = 1000;
  const rowH = 14;
  const rows = Math.min(data.outlets.length, 14);
  const H = rows * rowH + 30;
  const x = (iso: string) => 16 + ((+new Date(iso) - data.t0) / (data.t1 - data.t0)) * (W - 32);
  const sameDay = formatDate(new Date(data.t0)) === formatDate(new Date(data.t1));
  const label = (t: number) => (sameDay ? formatTime(new Date(t)) : `${formatDate(new Date(t), { day: "numeric", month: "short" })}, ${formatTime(new Date(t))}`);

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }} className="w-full overflow-visible" role="img" aria-label={`Timeline of ${reports.length} reports from ${data.outlets.length} outlets`}>
        <line x1={16} x2={W - 16} y1={H - 22} y2={H - 22} stroke="var(--rule-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {data.sorted.map((r, i) => {
          const row = Math.min(data.outlets.indexOf(r.outlet), rows - 1);
          const cx = x(r.publishedAt);
          const y = H - 30 - row * rowH;
          const first = i === 0;
          return (
            <motion.g
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 + (i / Math.max(1, data.sorted.length)) * 1.1, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHover(r)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(r.id)}
              className="cursor-pointer"
            >
              <line x1={cx} x2={cx} y1={y} y2={H - 22} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <rect x={cx - 3} y={y - 5} width={6} height={10} rx={1.5} fill={first ? "var(--pencil)" : hover?.id === r.id ? "var(--ink)" : "var(--ink-muted)"} />
              <rect x={cx - 10} y={y - 10} width={20} height={20} fill="transparent" />
            </motion.g>
          );
        })}
      </svg>
      <div className="meta -mt-4 flex justify-between px-1 num" aria-hidden>
        <span>{label(data.t0)}</span>
        <span>{label(data.t1)}</span>
      </div>
      <figcaption className="meta mt-2 min-h-[1.25rem]" aria-live="polite">
        {hover ? (
          <span>
            <span className="font-medium text-ink">{hover.outlet}</span>, {formatTime(hover.publishedAt)}: {hover.title}
          </span>
        ) : (
          <span>
            {reports.length} {reports.length === 1 ? "report" : "reports"} from {data.outlets.length}{" "}
            {data.outlets.length === 1 ? "outlet" : "outlets"}. {data.outlets[0]} reported first.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
