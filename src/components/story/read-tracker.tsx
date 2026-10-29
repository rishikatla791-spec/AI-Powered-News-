"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/client/use-me";

/** Records that a signed-in reader opened a story (used only to rank their own feed; deletable in settings). */
export function ReadTracker({ storyId }: { storyId: string }) {
  const { me } = useMe();
  useEffect(() => {
    if (!me.user) return;
    const t = setTimeout(() => {
      void fetch("/api/v1/me/reads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyId }),
        keepalive: true,
      }).catch(() => {});
    }, 8000);
    return () => clearTimeout(t);
  }, [me.user, storyId]);
  return null;
}
