/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file LRU Cache Utility
 * @module utils/lru-cache
 * @author FOIA Stream Team
 * @description High-performance Least Recently Used (LRU) cache implementation
 *              using a doubly-linked list and Map for O(1) operations.
 *              Used for caching expensive database queries and computations.
 * @compliance NIST 800-53 SI-2 (Flaw Remediation) - Performance optimization
 */

/**
 * Node in the doubly-linked list
 * @internal
 */
interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  expiresAt?: number;
}

/**
 * LRU Cache configuration
 * @interface
 */
export interface LRUCacheOptions {
  /** Maximum number of items in cache */
  maxSize: number;
  /** Default TTL in milliseconds (optional) */
  defaultTTL?: number;
  /** Callback when item is evicted */
  onEvict?: <K, V>(key: K, value: V) => void;
}

/**
 * High-performance LRU Cache with O(1) get/set operations
 *
 * @class LRUCache
 * @template K - Key type
 * @template V - Value type
 * @description Implements a Least Recently Used cache using a combination of
 *              a Map (for O(1) lookups) and a doubly-linked list (for O(1) eviction).
 *
 * Time Complexity:
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 * - has: O(1)
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, User>({ maxSize: 100, defaultTTL: 60000 });
 *
 * cache.set('user:123', userData);
 * const user = cache.get('user:123');
 * ```
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheNode<K, V>>;
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;
  private readonly maxSize: number;
  private readonly defaultTTL?: number;
  private readonly onEvict?: <K2, V2>(key: K2, value: V2) => void;

  constructor(options: LRUCacheOptions) {
    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.defaultTTL = options.defaultTTL;
    this.onEvict = options.onEvict;
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Value if found and not expired, undefined otherwise
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      return undefined;
    }

    // Check TTL expiration
    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);

    return node.value;
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL override in milliseconds
   */
  set(key: K, value: V, ttl?: number): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      existingNode.expiresAt = this.calculateExpiry(ttl);
      this.moveToFront(existingNode);
      return;
    }

    // Create new node
    const newNode: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: this.head,
      expiresAt: this.calculateExpiry(ttl),
    };

    // Add to front of list
    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;

    if (!this.tail) {
      this.tail = newNode;
    }

    this.cache.set(key, newNode);

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Check if key exists in cache (and not expired)
   */
  has(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Get or compute value (cache-aside pattern)
   * @param key - Cache key
   * @param compute - Function to compute value if not cached
   * @param ttl - Optional TTL override
   */
  async getOrCompute(key: K, compute: () => Promise<V>, ttl?: number): Promise<V> {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Synchronous get or compute
   */
  getOrComputeSync(key: K, compute: () => V, ttl?: number): V {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = compute();
    this.set(key, value, ttl);

    return value;
  }

  // ============================================
  // Private Methods
  // ============================================

  private calculateExpiry(ttl?: number): number | undefined {
    const effectiveTTL = ttl ?? this.defaultTTL;
    return effectiveTTL ? Date.now() + effectiveTTL : undefined;
  }

  private moveToFront(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return;
    }

    // Remove from current position
    this.removeNode(node);

    // Add to front
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const evictedNode = this.tail;

    // Call eviction callback
    if (this.onEvict) {
      this.onEvict(evictedNode.key, evictedNode.value);
    }

    // Remove from list
    this.removeNode(evictedNode);
    this.cache.delete(evictedNode.key);
  }
}

// ============================================
// Pre-configured Cache Instances
// ============================================

/**
 * Cache for agency data (frequently accessed, rarely changes)
 */
export const agencyCache = new LRUCache<string, unknown>({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
});

/**
 * Cache for user session validation results
 */
export const sessionCache = new LRUCache<string, unknown>({
  maxSize: 1000,
  defaultTTL: 30 * 1000, // 30 seconds
});

/**
 * Cache for rate limit IP lookups
 */
export const ipLookupCache = new LRUCache<string, boolean>({
  maxSize: 10000,
  defaultTTL: 60 * 1000, // 1 minute
});
