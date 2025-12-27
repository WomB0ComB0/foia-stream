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
 * @file IP Banlist Service
 * @module services/banlist
 * @author FOIA Stream Team
 * @description Manages banned and slowmode IPs/identifiers for security protection.
 *              Supports banning by IP address, user ID, and browser fingerprint.
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection) - GAP-007
 * @compliance ISO 27001 A.8.6 (Capacity Management)
 * @compliance CMMC 3.13.13 (Network Communication Protection)
 */

import { Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Ban Metadata Schema
 */
const BanMetadataSchema = S.Struct({
  reason: S.optional(S.String),
  timestamp: S.Number,
  bannedBy: S.optional(S.String),
  expiresAt: S.optional(S.Number),
});

export type BanMetadata = typeof BanMetadataSchema.Type;

/**
 * Ban Entry Schema
 */
const BanEntrySchema = S.Struct({
  identifier: S.String,
  type: S.Literal('ip', 'userId', 'fingerprint'),
  metadata: BanMetadataSchema,
});

export type BanEntry = typeof BanEntrySchema.Type;

/**
 * Slowmode Entry Schema
 */
const SlowmodeEntrySchema = S.Struct({
  identifier: S.String,
  reason: S.optional(S.String),
  timestamp: S.Number,
  multiplier: S.Number,
});

export type SlowmodeEntry = typeof SlowmodeEntrySchema.Type;

/**
 * Banlist Stats Schema
 */
const BanlistStatsSchema = S.Struct({
  totalBanned: S.Number,
  totalSlowed: S.Number,
  recentBans: S.Array(BanEntrySchema),
  recentSlowmodes: S.Array(SlowmodeEntrySchema),
});

export type BanlistStats = typeof BanlistStatsSchema.Type;

// ============================================
// In-Memory Storage (can be replaced with Redis)
// ============================================

class BanlistStore {
  private bannedIdentifiers = new Map<string, BanMetadata>();
  private slowedIdentifiers = new Map<string, SlowmodeEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup job every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Clean up expired bans
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [id, meta] of this.bannedIdentifiers.entries()) {
      if (meta.expiresAt && meta.expiresAt <= now) {
        this.bannedIdentifiers.delete(id);
      }
    }
  }

  /**
   * Check if identifier is banned
   */
  isBanned(identifier: string): boolean {
    if (!identifier || identifier === '127.0.0.1' || identifier === '::1') {
      return false;
    }

    const meta = this.bannedIdentifiers.get(identifier);
    if (!meta) return false;

    // Check if ban has expired
    if (meta.expiresAt && meta.expiresAt <= Date.now()) {
      this.bannedIdentifiers.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Check if identifier is in slowmode
   */
  isSlowed(identifier: string): boolean {
    if (!identifier || identifier === '127.0.0.1' || identifier === '::1') {
      return false;
    }

    return this.slowedIdentifiers.has(identifier);
  }

  /**
   * Get slowmode multiplier for identifier
   */
  getSlowmodeMultiplier(identifier: string): number {
    const entry = this.slowedIdentifiers.get(identifier);
    return entry?.multiplier ?? 1;
  }

  /**
   * Ban an identifier
   */
  ban(
    identifier: string,
    options?: {
      reason?: string;
      durationMs?: number;
      bannedBy?: string;
    },
  ): void {
    if (!identifier || identifier === '127.0.0.1' || identifier === '::1') {
      return;
    }

    const metadata: BanMetadata = {
      timestamp: Date.now(),
      reason: options?.reason,
      bannedBy: options?.bannedBy,
      expiresAt: options?.durationMs ? Date.now() + options.durationMs : undefined,
    };

    this.bannedIdentifiers.set(identifier, metadata);
  }

  /**
   * Unban an identifier
   */
  unban(identifier: string): boolean {
    return this.bannedIdentifiers.delete(identifier);
  }

  /**
   * Add identifier to slowmode
   */
  slow(
    identifier: string,
    options?: {
      reason?: string;
      multiplier?: number;
    },
  ): void {
    if (!identifier || identifier === '127.0.0.1' || identifier === '::1') {
      return;
    }

    const entry: SlowmodeEntry = {
      identifier,
      reason: options?.reason,
      timestamp: Date.now(),
      multiplier: options?.multiplier ?? 10, // 10x slower by default
    };

    this.slowedIdentifiers.set(identifier, entry);
  }

  /**
   * Remove identifier from slowmode
   */
  unslow(identifier: string): boolean {
    return this.slowedIdentifiers.delete(identifier);
  }

  /**
   * Get ban metadata for identifier
   */
  getBanMetadata(identifier: string): BanMetadata | null {
    return this.bannedIdentifiers.get(identifier) ?? null;
  }

  /**
   * Get all banned identifiers
   */
  getBannedList(): string[] {
    return Array.from(this.bannedIdentifiers.keys());
  }

  /**
   * Get all slowed identifiers
   */
  getSlowedList(): string[] {
    return Array.from(this.slowedIdentifiers.keys());
  }

  /**
   * Get banlist statistics
   */
  getStats(): BanlistStats {
    const bannedEntries = Array.from(this.bannedIdentifiers.entries())
      .map(([identifier, metadata]) => ({
        identifier,
        type: 'ip' as const,
        metadata,
      }))
      .slice(-10);

    const slowedEntries = Array.from(this.slowedIdentifiers.values()).slice(-10);

    return {
      totalBanned: this.bannedIdentifiers.size,
      totalSlowed: this.slowedIdentifiers.size,
      recentBans: bannedEntries,
      recentSlowmodes: slowedEntries,
    };
  }

  /**
   * Clear all bans and slowmodes
   */
  clear(): void {
    this.bannedIdentifiers.clear();
    this.slowedIdentifiers.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global store instance
const banlistStore = new BanlistStore();

// ============================================
// Exported Functions
// ============================================

/**
 * Check if an identifier is banned
 */
export function isIdentifierBanned(identifier: string): boolean {
  return banlistStore.isBanned(identifier);
}

/**
 * Check if an identifier is in slowmode
 */
export function isIdentifierSlowed(identifier: string): boolean {
  return banlistStore.isSlowed(identifier);
}

/**
 * Get slowmode multiplier for an identifier
 */
export function getSlowmodeMultiplier(identifier: string): number {
  return banlistStore.getSlowmodeMultiplier(identifier);
}

/**
 * Ban an identifier (IP, userId, etc.)
 */
export function banIdentifier(
  identifier: string,
  options?: {
    reason?: string;
    durationMs?: number;
    bannedBy?: string;
  },
): void {
  banlistStore.ban(identifier, options);
}

/**
 * Unban an identifier
 */
export function unbanIdentifier(identifier: string): boolean {
  return banlistStore.unban(identifier);
}

/**
 * Add identifier to slowmode (aggressive rate limiting)
 */
export function slowIdentifier(
  identifier: string,
  options?: {
    reason?: string;
    multiplier?: number;
  },
): void {
  banlistStore.slow(identifier, options);
}

/**
 * Remove identifier from slowmode
 */
export function unslowIdentifier(identifier: string): boolean {
  return banlistStore.unslow(identifier);
}

/**
 * Get ban metadata for an identifier
 */
export function getBanMetadata(identifier: string): BanMetadata | null {
  return banlistStore.getBanMetadata(identifier);
}

/**
 * Get list of all banned identifiers
 */
export function getBannedList(): string[] {
  return banlistStore.getBannedList();
}

/**
 * Get list of all slowed identifiers
 */
export function getSlowedList(): string[] {
  return banlistStore.getSlowedList();
}

/**
 * Get banlist statistics
 */
export function getBanlistStats(): BanlistStats {
  return banlistStore.getStats();
}

/**
 * Clear all bans and slowmodes
 */
export function clearBanlist(): void {
  banlistStore.clear();
}

// Export schemas
export { BanEntrySchema, BanlistStatsSchema, BanMetadataSchema, SlowmodeEntrySchema };
