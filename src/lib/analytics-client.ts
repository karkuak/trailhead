"use client";

// Segment-style client: track/identify/page, all forwarded to a single
// ingestion endpoint (/api/track). No third-party vendor is wired up in v1 —
// this local endpoint is the stand-in for the warehouse forwarder.

const SESSION_COOKIE = "th_sid";

function getSessionId(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (match) return decodeURIComponent(match[1]);
  // proxy.ts sets this cookie on first request; this is a defensive fallback.
  const fallback = crypto.randomUUID();
  document.cookie = `${SESSION_COOKIE}=${fallback}; path=/; max-age=31536000; SameSite=Lax`;
  return fallback;
}

let identifiedUserId: string | null = null;

function send(event: string, properties: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    event,
    userId: identifiedUserId,
    sessionId: getSessionId(),
    properties,
  });
  const url = "/api/track";
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon(url, blob);
    if (sent) return;
  }
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* best-effort in v1 */
  });
}

export const analytics = {
  /** Associates the current session with a known user (post signup/login). */
  identify(userId: string, traits: Record<string, unknown> = {}) {
    identifiedUserId = userId;
    send("identify", { ...traits, userId });
  },
  /** Records a product event with the given name and properties. */
  track(event: string, properties: Record<string, unknown> = {}) {
    send(event, properties);
  },
  /** Records a page view. */
  page(name: string, properties: Record<string, unknown> = {}) {
    send("page_viewed", { page: name, ...properties });
  },
  getSessionId,
};
