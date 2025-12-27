import { CacheEntry } from "./types.js";

/**
 * Simple in-memory LRU cache for Spotify API responses
 * Reduces API calls for repeated queries
 */
export class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 300000) {
    // 5 min default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    // LRU: if cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    // console.log(`Cache SET: ${key}`);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      // console.log(`Cache MISS: ${key}`);
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      // console.log(`Cache EXPIRED: ${key}`);
      return null;
    }

    // console.log(`Cache HIT: ${key}`);
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
    console.log("Cache cleared");
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instances
export const searchCache = new SimpleCache<any>(50, 300000); // 5 min TTL for search
export const recommendCache = new SimpleCache<any>(50, 600000); // 10 min TTL for recommendations

export default SimpleCache;
