/**
 * ARCHITECTURE: Self-Cleaning Atomic Cache
 * * Prevents memory leaks with auto-purge.
 * * "Atomic Fetch" prevents multiple identical network requests from firing at once.
 */
export class FastCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private pending = new Map<string, Promise<T>>(); // Track ongoing requests
  private ttl: number;

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs;
  }

  /**
   * ATOMIC EXECUTION:
   * This is the "Gold Standard." It checks the cache, and if empty,
   * executes the fetcher. If 5 components call this at once, 
   * only ONE network request happens.
   */
  async fetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached) return cached;

    // Check if a request for this key is already in progress
    const existingPromise = this.pending.get(key);
    if (existingPromise) return existingPromise;

    const promise = fetcher().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);

    const data = await promise;
    this.set(key, data);
    return data;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // AUTO-PURGE: Cleanup memory automatically after TTL
    setTimeout(() => {
      if (this.cache.has(key)) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp >= this.ttl) {
          this.cache.delete(key);
        }
      }
    }, this.ttl);
  }

  clear(): void {
    this.cache.clear();
  }
}