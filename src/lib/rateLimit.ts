type Bucket = { times: number[] };

const buckets = new Map<string, Bucket>();

export function hitRateLimit(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { times: [] };
  bucket.times = bucket.times.filter((time) => time > cutoff);
  if (bucket.times.length >= max) {
    buckets.set(key, bucket);
    return true;
  }
  bucket.times.push(now);
  buckets.set(key, bucket);
  return false;
}
