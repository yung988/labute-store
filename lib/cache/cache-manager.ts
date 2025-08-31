/**
 * Simple in-memory cache manager for frequently accessed data
 * Provides TTL (Time To Live) support and automatic cleanup
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval (runs every 5 minutes)
    this.startCleanupInterval();
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };

    this.cache.set(key, entry);
  }

  /**
   * Get data from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for cleanup)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Cache key constants
export const CACHE_KEYS = {
  // User data
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,

  // Admin data
  ADMIN_STATS: 'admin:stats',
  ADMIN_PRODUCTS: 'admin:products',
  ADMIN_ORDERS_COUNT: 'admin:orders:count',

  // Product data
  PRODUCT_LIST: 'products:list',
  PRODUCT_DETAIL: (id: string) => `product:detail:${id}`,

  // Order data
  ORDER_DETAIL: (id: string) => `order:detail:${id}`,
  ORDER_STATS: 'orders:stats',

  // Configuration
  CONFIG_SETTINGS: 'config:settings',
  CONFIG_PACKETA: 'config:packeta'
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  // Short-lived (5 minutes)
  USER_SESSION: 5 * 60 * 1000,
  USER_PROFILE: 5 * 60 * 1000,

  // Medium-lived (15 minutes)
  ADMIN_STATS: 15 * 60 * 1000,
  ADMIN_PRODUCTS: 15 * 60 * 1000,
  PRODUCT_LIST: 15 * 60 * 1000,

  // Long-lived (30 minutes)
  PRODUCT_DETAIL: 30 * 60 * 1000,
  ORDER_DETAIL: 30 * 60 * 1000,
  CONFIG_SETTINGS: 30 * 60 * 1000,

  // Very short-lived (1 minute) - for frequently changing data
  ORDER_STATS: 1 * 60 * 1000,
  ADMIN_ORDERS_COUNT: 1 * 60 * 1000
} as const;

/**
 * Cached function wrapper
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cacheKey: string | ((...args: Parameters<T>) => string),
  ttl: number
): T {
  return (async (...args: Parameters<T>) => {
    // Generate cache key
    const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey;

    // Try to get from cache first
    const cached = cacheManager.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    cacheManager.set(key, result, ttl);

    return result;
  }) as T;
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern: string): void {
  const keys = Array.from(cacheManager['cache'].keys());
  const regex = new RegExp(pattern.replace('*', '.*'));

  keys.forEach(key => {
    if (regex.test(key)) {
      cacheManager.delete(key);
    }
  });
}

/**
 * Cache middleware for API routes
 */
export function withApiCache<T>(
  handler: () => Promise<T>,
  cacheKey: string,
  ttl: number = CACHE_TTL.ADMIN_STATS
): () => Promise<T> {
  return async () => {
    // Try cache first
    const cached = cacheManager.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute handler and cache
    const result = await handler();
    cacheManager.set(cacheKey, result, ttl);

    return result;
  };
}