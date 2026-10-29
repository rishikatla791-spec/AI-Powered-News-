/**
 * The coverage strip: one mark per outlet that reported the story, in the order
 * they reported it. The first mark is in blue pencil. It is the visual signature
 * of Lede, a story's corroboration at a glance.
 */
export function CoverageStrip({
  outlets,
  size = "sm",
  showLabel = true,
  className = "",
}: {
  outlets: string[];
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const n = outlets.length;
  const shown = outlets.slice(0, 24);
  const h = size === "md" ? 16 : 11;
  const w = size === "md" ? 4 : 3;
  const label =
    n <= 1
      ? `Reported by ${outlets[0] ?? "one outlet"}`
      : n === 2
        ? `${outlets[0]} and ${outlets[1]}`
        : `${outlets[0]} first, then ${n - 1} more`;
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label={`${n} ${n === 1 ? "outlet" : "outlets"}: ${outlets.join(", ")}`}
      role="img"
    >
      <span className="inline-flex items-end gap-[2px]" aria-hidden>
        {shown.map((o, i) => (
          <span
            key={`${o}-${i}`}
            title={o}
            className={i === 0 ? "bg-pencil" : "bg-ink-muted/55"}
            style={{ width: w, height: i === 0 ? h : h - 3, borderRadius: 1 }}
          />
        ))}
      </span>
      {showLabel && (
        <span className="meta">
          <span className="num text-ink-2">{n}</span> {n === 1 ? "outlet" : "outlets"}
          <span className="hidden sm:inline">, {label}</span>
        </span>
      )}
    </span>
  );
}
