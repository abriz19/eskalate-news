const READ_COOLDOWN_MS = 10_000;

const lastReadByKey = new Map<string, number>();

function cacheKey(articleId: string, readerId: string | null): string {
  return `${articleId}:${readerId ?? "guest"}`;
}

export function canLogRead(articleId: string, readerId: string | null): boolean {
  const key = cacheKey(articleId, readerId);
  const last = lastReadByKey.get(key);
  const now = Date.now();
  if (last !== undefined && now - last < READ_COOLDOWN_MS) return false;
  lastReadByKey.set(key, now);
  return true;
}

export function pruneReadTracking(): void {
  const cutoff = Date.now() - READ_COOLDOWN_MS;
  for (const [k, v] of lastReadByKey.entries()) {
    if (v < cutoff) lastReadByKey.delete(k);
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(pruneReadTracking, 60_000);
}
