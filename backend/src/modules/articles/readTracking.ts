/** Cooldown window: at most one ReadLog per (article, reader) per this many ms. */
export const READ_COOLDOWN_MS = 10_000;

const lastReadByKey = new Map<string, number>();

function cacheKey(articleId: string, readerId: string | null): string {
  return `${articleId}:${readerId ?? "guest"}`;
}

/**
 * Returns true if a ReadLog is allowed for this (articleId, readerId) pair.
 * Within READ_COOLDOWN_MS of the last allowed read for the same key, returns false.
 * Memory-safe: pruneReadTracking() (or resetReadTrackingForTests()) should be used to clear old entries.
 */
export function canLogRead(articleId: string, readerId: string | null): boolean {
  const key = cacheKey(articleId, readerId);
  const last = lastReadByKey.get(key);
  const now = Date.now();
  if (last !== undefined && now - last < READ_COOLDOWN_MS) return false;
  lastReadByKey.set(key, now);
  return true;
}

/** Removes entries older than READ_COOLDOWN_MS to limit memory growth under high load. */
export function pruneReadTracking(): void {
  const cutoff = Date.now() - READ_COOLDOWN_MS;
  for (const [k, v] of lastReadByKey.entries()) {
    if (v < cutoff) lastReadByKey.delete(k);
  }
}

/** Only for tests: clears the cooldown map so tests can assert fresh read-logging behavior. */
export function resetReadTrackingForTests(): void {
  lastReadByKey.clear();
}

if (typeof setInterval !== "undefined" && process.env.NODE_ENV !== "test") {
  setInterval(pruneReadTracking, 60_000);
}
