export function logClientPerformance(event: string, durationMs: number, details?: Record<string, unknown>) {
  const payload = JSON.stringify({
    event,
    durationMs: Math.round(durationMs),
    details: details || {},
    recordedAt: new Date().toISOString(),
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/performance", payload);
    return;
  }

  void fetch("/api/performance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
