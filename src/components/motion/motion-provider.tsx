"use client";

import { MotionConfig } from "motion/react";
import { useClientValue } from "@/lib/client/use-client-value";

/** "user" follows the OS setting; the reader's own "Reduce motion" toggle forces it on. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const forced = useClientValue(() => document.documentElement.dataset.motion === "reduced", false);
  return <MotionConfig reducedMotion={forced ? "always" : "user"}>{children}</MotionConfig>;
}
