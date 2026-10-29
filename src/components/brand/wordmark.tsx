/**
 * The Lede wordmark: the name set in narrow heavy Instrument Sans, underscored
 * by a single blue-pencil stroke, the mark an editor makes under the line that matters.
 */
export function Wordmark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`relative inline-flex flex-col leading-none ${className}`} aria-label="Lede">
      <span
        aria-hidden
        className="hed text-ink"
        style={{ fontSize: compact ? "1.5rem" : "1.875rem", fontWeight: 760, letterSpacing: "-0.03em", lineHeight: 0.9 }}
      >
        Lede
      </span>
      <svg aria-hidden viewBox="0 0 64 8" className="mt-[3px] h-[6px] w-[78%] text-pencil" preserveAspectRatio="none">
        <path d="M1.5 5.2C14 3.4 30 2.6 46 3.1c6 .2 11 .7 16.5 1.6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#1d2025" />
      <path d="M21 14h9v28h15v8H21z" fill="#f6f6f3" />
      <path d="M17 55.5c10-1.6 21-2 31-.8" fill="none" stroke="#8fa5ff" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
