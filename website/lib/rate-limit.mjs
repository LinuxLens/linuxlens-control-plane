const buckets = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 6;

export function rateLimitAllowContact(key) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}
