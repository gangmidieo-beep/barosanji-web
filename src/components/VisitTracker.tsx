"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** 방문을 /api/track 으로 기록한다. utm_source(광고) → referrer → 직접 순으로 유입경로를 잡는다. */
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let source = params.get("utm_source") || "";
      if (!source && document.referrer) {
        try {
          source = new URL(document.referrer).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }
      }
      if (!source) source = "직접";
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, source }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}
