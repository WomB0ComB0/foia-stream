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
 * @file CIDR Range Banlist Service
 * @module services/cidr-banlist
 * @author FOIA Stream Team
 * @description Provides IP range-based banning using CIDR notation.
 *              Supports both IPv4 and IPv6 address ranges for comprehensive network blocking.
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection) - GAP-007
 * @compliance ISO 27001 A.8.6 (Capacity Management)
 * @compliance CMMC 3.13.13 (Network Communication Protection)
 */

import { Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * CIDR Entry Schema
 */
const CIDREntrySchema = S.Struct({
  cidr: S.String,
  reason: S.optional(S.String),
  timestamp: S.Number,
  bannedBy: S.optional(S.String),
});

export type CIDREntry = typeof CIDREntrySchema.Type;

/**
 * CIDR Stats Schema
 */
const CIDRStatsSchema = S.Struct({
  totalRanges: S.Number,
  ipv4Ranges: S.Number,
  ipv6Ranges: S.Number,
  entries: S.Array(CIDREntrySchema),
});

export type CIDRStats = typeof CIDRStatsSchema.Type;

// ============================================
// IPv4/IPv6 Utilities
// ============================================

/**
 * Parse IPv4 address to numeric value
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (Number.isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) + num;
  }
  return result >>> 0; // Ensure unsigned
}

/**
 * Parse IPv6 address to BigInt
 */
function ipv6ToBigInt(ip: string): bigint | null {
  // Expand :: shorthand
  let expanded = ip;
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0');
    expanded = [...left, ...middle, ...right].join(':');
  }

  const parts = expanded.split(':');
  if (parts.length !== 8) return null;

  let result = BigInt(0);
  for (const part of parts) {
    const num = parseInt(part || '0', 16);
    if (Number.isNaN(num) || num < 0 || num > 0xffff) return null;
    result = (result << BigInt(16)) + BigInt(num);
  }
  return result;
}

/**
 * Check if an IP is IPv6
 */
function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/**
 * Validate CIDR notation
 */
function isValidCIDR(cidr: string): boolean {
  const [range, prefixStr] = cidr.split('/');
  if (!range || !prefixStr) return false;

  const prefix = parseInt(prefixStr, 10);
  if (Number.isNaN(prefix)) return false;

  if (isIPv6(range)) {
    if (prefix < 0 || prefix > 128) return false;
    return ipv6ToBigInt(range) !== null;
  } else {
    if (prefix < 0 || prefix > 32) return false;
    return ipv4ToNumber(range) !== null;
  }
}

// ============================================
// CIDR Store with Optimized Lookup
// ============================================

/**
 * Parsed CIDR range for efficient comparison
 * @internal
 */
interface ParsedCIDR {
  cidr: string;
  isIPv6: boolean;
  /** For IPv4: numeric start of range */
  startNum?: number;
  /** For IPv4: numeric end of range */
  endNum?: number;
  /** For IPv6: BigInt start of range */
  startBigInt?: bigint;
  /** For IPv6: BigInt end of range */
  endBigInt?: bigint;
  entry: CIDREntry;
}

/**
 * Optimized CIDR Banlist Store
 *
 * Uses sorted arrays with binary search for O(log n) lookups instead of O(n).
 * Maintains separate IPv4 and IPv6 structures for efficiency.
 *
 * Time Complexity:
 * - isIPBanned: O(log n) for IPv4, O(n) worst case for overlapping IPv6 ranges
 * - banCIDR: O(n) for insertion (maintains sorted order)
 * - unbanCIDR: O(n) for removal
 */
class CIDRBanlistStore {
  private bannedRanges = new Map<string, CIDREntry>();

  /** Sorted IPv4 ranges by start address for binary search */
  private ipv4Ranges: ParsedCIDR[] = [];
  /** IPv6 ranges (fewer expected, linear scan acceptable) */
  private ipv6Ranges: ParsedCIDR[] = [];

  /**
   * Parse CIDR into numeric range for efficient comparison
   */
  private parseCIDR(cidr: string, entry: CIDREntry): ParsedCIDR | null {
    const [range, prefixStr] = cidr.split('/');
    if (!range || !prefixStr) return null;

    const prefix = parseInt(prefixStr, 10);
    const isV6 = isIPv6(range);

    if (isV6) {
      const start = ipv6ToBigInt(range);
      if (start === null) return null;

      // Calculate range end
      const hostBits = 128 - prefix;
      const end = start + (BigInt(1) << BigInt(hostBits)) - BigInt(1);

      return {
        cidr,
        isIPv6: true,
        startBigInt: start,
        endBigInt: end,
        entry,
      };
    } else {
      const startNum = ipv4ToNumber(range);
      if (startNum === null) return null;

      // Calculate range using mask
      const hostBits = 32 - prefix;
      const mask = prefix === 0 ? 0 : (~0 << hostBits) >>> 0;
      const networkStart = (startNum & mask) >>> 0;
      const networkEnd = (networkStart | (~mask >>> 0)) >>> 0;

      return {
        cidr,
        isIPv6: false,
        startNum: networkStart,
        endNum: networkEnd,
        entry,
      };
    }
  }

  /**
   * Binary search to find if IPv4 is in any banned range
   * O(log n) complexity
   */
  private binarySearchIPv4(ipNum: number): ParsedCIDR | null {
    const ranges = this.ipv4Ranges;
    let left = 0;
    let right = ranges.length - 1;

    // First, find ranges that could contain this IP using binary search
    // We're looking for ranges where start <= ipNum
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = ranges[mid];

      if (!range || range.startNum === undefined || range.endNum === undefined) {
        left = mid + 1;
        continue;
      }

      if (ipNum >= range.startNum && ipNum <= range.endNum) {
        return range;
      }

      if (ipNum < range.startNum) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Check neighboring ranges for overlaps
    // In case of overlapping CIDR ranges, we need to check adjacent entries
    for (let i = Math.max(0, left - 2); i <= Math.min(ranges.length - 1, left + 2); i++) {
      const range = ranges[i];
      if (
        range &&
        range.startNum !== undefined &&
        range.endNum !== undefined &&
        ipNum >= range.startNum &&
        ipNum <= range.endNum
      ) {
        return range;
      }
    }

    return null;
  }

  /**
   * Check if an IP is in any banned CIDR range
   * O(log n) for IPv4, O(n) for IPv6
   */
  isIPBanned(ip: string): boolean {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return false;
    }

    if (isIPv6(ip)) {
      const ipBigInt = ipv6ToBigInt(ip);
      if (ipBigInt === null) return false;

      // Linear scan for IPv6 (typically few entries)
      for (const range of this.ipv6Ranges) {
        if (
          range.startBigInt !== undefined &&
          range.endBigInt !== undefined &&
          ipBigInt >= range.startBigInt &&
          ipBigInt <= range.endBigInt
        ) {
          return true;
        }
      }
      return false;
    }

    // IPv4: Use optimized binary search
    const ipNum = ipv4ToNumber(ip);
    if (ipNum === null) return false;

    return this.binarySearchIPv4(ipNum) !== null;
  }

  /**
   * Get the CIDR range that banned an IP
   */
  getMatchingCIDR(ip: string): string | null {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return null;
    }

    if (isIPv6(ip)) {
      const ipBigInt = ipv6ToBigInt(ip);
      if (ipBigInt === null) return null;

      for (const range of this.ipv6Ranges) {
        if (
          range.startBigInt !== undefined &&
          range.endBigInt !== undefined &&
          ipBigInt >= range.startBigInt &&
          ipBigInt <= range.endBigInt
        ) {
          return range.cidr;
        }
      }
      return null;
    }

    const ipNum = ipv4ToNumber(ip);
    if (ipNum === null) return null;

    const match = this.binarySearchIPv4(ipNum);
    return match?.cidr ?? null;
  }

  /**
   * Ban a CIDR range
   * O(n) due to maintaining sorted order
   */
  banCIDR(
    cidr: string,
    options?: {
      reason?: string;
      bannedBy?: string;
    },
  ): boolean {
    if (!isValidCIDR(cidr)) {
      return false;
    }

    const entry: CIDREntry = {
      cidr,
      reason: options?.reason,
      timestamp: Date.now(),
      bannedBy: options?.bannedBy,
    };

    const parsed = this.parseCIDR(cidr, entry);
    if (!parsed) return false;

    this.bannedRanges.set(cidr, entry);

    // Insert into sorted array
    if (parsed.isIPv6) {
      this.ipv6Ranges.push(parsed);
      // Sort by start address
      this.ipv6Ranges.sort((a, b) => {
        const aStart = a.startBigInt ?? BigInt(0);
        const bStart = b.startBigInt ?? BigInt(0);
        return aStart < bStart ? -1 : aStart > bStart ? 1 : 0;
      });
    } else {
      this.ipv4Ranges.push(parsed);
      // Sort by start address for binary search
      this.ipv4Ranges.sort((a, b) => (a.startNum ?? 0) - (b.startNum ?? 0));
    }

    return true;
  }

  /**
   * Unban a CIDR range
   */
  unbanCIDR(cidr: string): boolean {
    if (!this.bannedRanges.delete(cidr)) {
      return false;
    }

    // Remove from sorted arrays
    const isV6 = isIPv6(cidr.split('/')[0] ?? '');

    if (isV6) {
      this.ipv6Ranges = this.ipv6Ranges.filter((r) => r.cidr !== cidr);
    } else {
      this.ipv4Ranges = this.ipv4Ranges.filter((r) => r.cidr !== cidr);
    }

    return true;
  }

  /**
   * Get entry for a CIDR range
   */
  getCIDREntry(cidr: string): CIDREntry | null {
    return this.bannedRanges.get(cidr) ?? null;
  }

  /**
   * Get all banned CIDR ranges
   */
  getBannedCIDRs(): string[] {
    return Array.from(this.bannedRanges.keys());
  }

  /**
   * Get statistics
   */
  getStats(): CIDRStats {
    const entries = Array.from(this.bannedRanges.values());

    return {
      totalRanges: entries.length,
      ipv4Ranges: this.ipv4Ranges.length,
      ipv6Ranges: this.ipv6Ranges.length,
      entries,
    };
  }

  /**
   * Clear all banned ranges
   */
  clear(): void {
    this.bannedRanges.clear();
    this.ipv4Ranges = [];
    this.ipv6Ranges = [];
  }
}

// Global store instance
const cidrStore = new CIDRBanlistStore();

// ============================================
// Exported Functions
// ============================================

/**
 * Check if an IP is in any banned CIDR range
 */
export function isIPInBannedCIDR(ip: string): boolean {
  return cidrStore.isIPBanned(ip);
}

/**
 * Get the CIDR range that matches an IP
 */
export function getMatchingBannedCIDR(ip: string): string | null {
  return cidrStore.getMatchingCIDR(ip);
}

/**
 * Ban a CIDR range
 */
export function banCIDRRange(
  cidr: string,
  options?: {
    reason?: string;
    bannedBy?: string;
  },
): boolean {
  return cidrStore.banCIDR(cidr, options);
}

/**
 * Unban a CIDR range
 */
export function unbanCIDRRange(cidr: string): boolean {
  return cidrStore.unbanCIDR(cidr);
}

/**
 * Get entry for a CIDR range
 */
export function getCIDREntry(cidr: string): CIDREntry | null {
  return cidrStore.getCIDREntry(cidr);
}

/**
 * Get all banned CIDR ranges
 */
export function getBannedCIDRRanges(): string[] {
  return cidrStore.getBannedCIDRs();
}

/**
 * Get CIDR banlist statistics
 */
export function getCIDRStats(): CIDRStats {
  return cidrStore.getStats();
}

/**
 * Clear all banned CIDR ranges
 */
export function clearCIDRBanlist(): void {
  cidrStore.clear();
}

/**
 * Validate CIDR notation
 */
export { isValidCIDR };

// Export schemas
export { CIDREntrySchema, CIDRStatsSchema };
