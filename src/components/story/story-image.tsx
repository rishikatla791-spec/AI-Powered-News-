"use client";

import { useState } from "react";
import { topicName } from "@/lib/topics";

/**
 * Publisher image with a typographic fallback. If the image is missing or the
 * publisher blocks hot-linking, a quiet block with the section name takes its place.
 */
export function StoryImage({
  src,
  topic,
  ratio = "3 / 2",
  className = "",
  priority = false,
}: {
  src: string | null;
  topic: string;
  ratio?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden rounded-[4px] bg-paper-sunk ${className}`} style={{ aspectRatio: ratio }}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="img-tone absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-end p-4">
          <span className="hed text-[1.375rem] text-ink-muted/70">{topicName(topic)}</span>
          <svg aria-hidden viewBox="0 0 64 8" className="absolute right-4 bottom-5 h-[5px] w-10 text-pencil/60" preserveAspectRatio="none">
            <path d="M1.5 5.2C14 3.4 30 2.6 46 3.1c6 .2 11 .7 16.5 1.6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
