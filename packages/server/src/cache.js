/** Minimal in-memory TTL cache with a size bound. */
export class TtlCache {
  constructor(ttlMs, maxEntries = 1000) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  get(key) {
    if (this.ttlMs <= 0) return undefined;
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key, value) {
    if (this.ttlMs <= 0) return;
    if (this.map.size >= this.maxEntries) this.map.delete(this.map.keys().next().value);
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
