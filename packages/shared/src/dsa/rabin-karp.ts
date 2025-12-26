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
 * @file Rabin-Karp String Matching Algorithm
 * @module dsa/rabin-karp
 * @author FOIA Stream Team
 * @description Efficient pattern matching using rolling hash for document search.
 *              O(n+m) average case, O(nm) worst case.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

// ============================================
// Types & Interfaces
// ============================================

/**
 * Result of a pattern match
 */
export interface PatternMatch {
  /** Starting index of the match in the text */
  index: number;
  /** The matched substring */
  match: string;
  /** Line number (if text contains newlines) */
  line?: number;
  /** Column number within the line */
  column?: number;
}

/**
 * Options for Rabin-Karp search
 */
export interface RabinKarpOptions {
  /** Whether to perform case-insensitive search (default: false) */
  caseInsensitive?: boolean;
  /** Maximum number of matches to return (default: unlimited) */
  maxMatches?: number;
  /** Include line/column information (default: true) */
  includeLineInfo?: boolean;
}

/**
 * Statistics for search operation
 */
export interface SearchStats {
  /** Total characters processed */
  charactersProcessed: number;
  /** Number of hash collisions (false positives checked) */
  hashCollisions: number;
  /** Number of matches found */
  matchesFound: number;
  /** Time taken in milliseconds */
  timeTakenMs: number;
}

// ============================================
// Constants
// ============================================

/**
 * Base for polynomial rolling hash (number of characters in the input alphabet)
 * Using 256 for extended ASCII support
 */
const BASE = 256;

/**
 * Modulus for hash to prevent integer overflow
 * Using a large prime number
 */
const MOD = 1_000_000_007;

// ============================================
// Rabin-Karp Implementation
// ============================================

/**
 * Rabin-Karp string matching algorithm implementation
 *
 * Uses rolling hash for efficient pattern matching in text.
 * Particularly efficient for multiple pattern searches.
 *
 * Time Complexity:
 * - Average case: O(n + m) where n = text length, m = pattern length
 * - Worst case: O(nm) with many hash collisions
 *
 * Space Complexity: O(1) for single pattern, O(k) for k patterns
 *
 * @example
 * ```typescript
 * const matcher = new RabinKarp();
 *
 * // Single pattern search
 * const matches = matcher.search('The quick brown fox', 'quick');
 * // Returns [{ index: 4, match: 'quick' }]
 *
 * // Multiple patterns
 * const multiMatches = matcher.searchMultiple(
 *   'The quick brown fox jumps over the lazy dog',
 *   ['quick', 'fox', 'dog']
 * );
 * ```
 */
export class RabinKarp {
  private readonly caseInsensitive: boolean;
  private readonly maxMatches: number;
  private readonly includeLineInfo: boolean;

  /**
   * Creates a new Rabin-Karp matcher
   * @param options - Configuration options
   */
  constructor(options: RabinKarpOptions = {}) {
    this.caseInsensitive = options.caseInsensitive ?? false;
    this.maxMatches = options.maxMatches ?? Number.MAX_SAFE_INTEGER;
    this.includeLineInfo = options.includeLineInfo ?? true;
  }

  /**
   * Searches for a pattern in text using Rabin-Karp algorithm
   *
   * @param text - The text to search in
   * @param pattern - The pattern to search for
   * @returns Array of matches found
   *
   * @example
   * ```typescript
   * const matches = matcher.search(
   *   'FOIA request submitted for FBI records',
   *   'FBI'
   * );
   * ```
   */
  search(text: string, pattern: string): PatternMatch[] {
    if (!text || !pattern || pattern.length > text.length) {
      return [];
    }

    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;
    const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

    const matches: PatternMatch[] = [];
    const n = normalizedText.length;
    const m = normalizedPattern.length;

    // Calculate hash for pattern and first window of text
    const patternHash = this.calculateHash(normalizedPattern, m);
    let textHash = this.calculateHash(normalizedText, m);

    // Precompute BASE^(m-1) % MOD for rolling hash
    let h = 1;
    for (let i = 0; i < m - 1; i++) {
      h = (h * BASE) % MOD;
    }

    // Line tracking for includeLineInfo
    const lineStarts = this.includeLineInfo ? this.getLineStarts(text) : [];

    // Slide the pattern over text
    for (let i = 0; i <= n - m; i++) {
      // Check if hash values match
      if (patternHash === textHash) {
        // Verify actual string match (to handle hash collisions)
        if (this.verifyMatch(normalizedText, normalizedPattern, i)) {
          const match: PatternMatch = {
            index: i,
            match: text.substring(i, i + m),
          };

          if (this.includeLineInfo) {
            const lineInfo = this.getLineAndColumn(i, lineStarts);
            match.line = lineInfo.line;
            match.column = lineInfo.column;
          }

          matches.push(match);

          if (matches.length >= this.maxMatches) {
            return matches;
          }
        }
      }

      // Calculate hash for next window (rolling hash)
      if (i < n - m) {
        textHash = this.rollingHash(
          textHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + m),
          h,
        );
      }
    }

    return matches;
  }

  /**
   * Searches for multiple patterns simultaneously
   *
   * @param text - The text to search in
   * @param patterns - Array of patterns to search for
   * @returns Map of pattern to matches
   *
   * @example
   * ```typescript
   * const results = matcher.searchMultiple(documentText, [
   *   'classified',
   *   'confidential',
   *   'restricted'
   * ]);
   * ```
   */
  searchMultiple(text: string, patterns: string[]): Map<string, PatternMatch[]> {
    const results = new Map<string, PatternMatch[]>();

    if (!text || patterns.length === 0) {
      return results;
    }

    // Filter out empty patterns and patterns longer than text
    const validPatterns = patterns.filter((p) => p && p.length <= text.length);

    // Group patterns by length for optimization
    const patternsByLength = new Map<number, string[]>();
    for (const pattern of validPatterns) {
      const len = pattern.length;
      const group = patternsByLength.get(len) ?? [];
      group.push(pattern);
      patternsByLength.set(len, group);
    }

    // Search for each length group
    for (const [length, patternGroup] of patternsByLength) {
      const groupMatches = this.searchPatternGroup(text, patternGroup, length);

      for (const [pattern, matches] of groupMatches) {
        results.set(pattern, matches);
      }
    }

    return results;
  }

  /**
   * Searches with statistics for performance monitoring
   *
   * @param text - The text to search in
   * @param pattern - The pattern to search for
   * @returns Object containing matches and statistics
   */
  searchWithStats(text: string, pattern: string): { matches: PatternMatch[]; stats: SearchStats } {
    const startTime = performance.now();
    let hashCollisions = 0;

    if (!text || !pattern || pattern.length > text.length) {
      return {
        matches: [],
        stats: {
          charactersProcessed: 0,
          hashCollisions: 0,
          matchesFound: 0,
          timeTakenMs: performance.now() - startTime,
        },
      };
    }

    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;
    const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

    const matches: PatternMatch[] = [];
    const n = normalizedText.length;
    const m = normalizedPattern.length;

    const patternHash = this.calculateHash(normalizedPattern, m);
    let textHash = this.calculateHash(normalizedText, m);

    let h = 1;
    for (let i = 0; i < m - 1; i++) {
      h = (h * BASE) % MOD;
    }

    const lineStarts = this.includeLineInfo ? this.getLineStarts(text) : [];

    for (let i = 0; i <= n - m; i++) {
      if (patternHash === textHash) {
        if (this.verifyMatch(normalizedText, normalizedPattern, i)) {
          const match: PatternMatch = {
            index: i,
            match: text.substring(i, i + m),
          };

          if (this.includeLineInfo) {
            const lineInfo = this.getLineAndColumn(i, lineStarts);
            match.line = lineInfo.line;
            match.column = lineInfo.column;
          }

          matches.push(match);

          if (matches.length >= this.maxMatches) {
            break;
          }
        } else {
          hashCollisions++;
        }
      }

      if (i < n - m) {
        textHash = this.rollingHash(
          textHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + m),
          h,
        );
      }
    }

    return {
      matches,
      stats: {
        charactersProcessed: n,
        hashCollisions,
        matchesFound: matches.length,
        timeTakenMs: performance.now() - startTime,
      },
    };
  }

  /**
   * Finds all unique patterns of a given length that appear more than once
   * Useful for finding duplicate phrases in documents
   *
   * @param text - The text to analyze
   * @param patternLength - Length of patterns to find
   * @param minOccurrences - Minimum occurrences to include (default: 2)
   * @returns Map of patterns to their occurrence count
   */
  findRepeatedPatterns(
    text: string,
    patternLength: number,
    minOccurrences = 2,
  ): Map<string, number> {
    const occurrences = new Map<string, number>();

    if (!text || patternLength <= 0 || patternLength > text.length) {
      return occurrences;
    }

    const hashToPatterns = new Map<number, string[]>();
    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;

    let h = 1;
    for (let i = 0; i < patternLength - 1; i++) {
      h = (h * BASE) % MOD;
    }

    let currentHash = this.calculateHash(normalizedText, patternLength);

    for (let i = 0; i <= normalizedText.length - patternLength; i++) {
      const pattern = text.substring(i, i + patternLength);
      const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

      // Check for patterns with same hash
      const existingPatterns = hashToPatterns.get(currentHash) ?? [];

      let found = false;
      for (const existing of existingPatterns) {
        const normalizedExisting = this.caseInsensitive ? existing.toLowerCase() : existing;
        if (normalizedExisting === normalizedPattern) {
          occurrences.set(existing, (occurrences.get(existing) ?? 1) + 1);
          found = true;
          break;
        }
      }

      if (!found) {
        existingPatterns.push(pattern);
        hashToPatterns.set(currentHash, existingPatterns);
      }

      // Rolling hash for next position
      if (i < normalizedText.length - patternLength) {
        currentHash = this.rollingHash(
          currentHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + patternLength),
          h,
        );
      }
    }

    // Filter by minimum occurrences
    const result = new Map<string, number>();
    for (const [pattern, count] of occurrences) {
      if (count >= minOccurrences) {
        result.set(pattern, count);
      }
    }

    return result;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Calculates hash for a string
   * @param str - String to hash
   * @param length - Length to consider
   * @returns Hash value
   * @private
   */
  private calculateHash(str: string, length: number): number {
    let hash = 0;

    for (let i = 0; i < length; i++) {
      hash = (hash * BASE + str.charCodeAt(i)) % MOD;
    }

    return hash;
  }

  /**
   * Calculates rolling hash for the next window
   * @param oldHash - Previous hash value
   * @param oldChar - Character leaving the window
   * @param newChar - Character entering the window
   * @param h - Precomputed BASE^(m-1) % MOD
   * @returns New hash value
   * @private
   */
  private rollingHash(oldHash: number, oldChar: number, newChar: number, h: number): number {
    let newHash = (oldHash - oldChar * h) % MOD;
    newHash = (newHash * BASE + newChar) % MOD;

    // Handle negative modulo
    if (newHash < 0) {
      newHash += MOD;
    }

    return newHash;
  }

  /**
   * Verifies actual string match (handles hash collisions)
   * @param text - Text to check
   * @param pattern - Pattern to match
   * @param startIndex - Starting index in text
   * @returns True if strings match
   * @private
   */
  private verifyMatch(text: string, pattern: string, startIndex: number): boolean {
    for (let i = 0; i < pattern.length; i++) {
      if (text[startIndex + i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets line start positions for line/column calculation
   * @param text - Text to analyze
   * @returns Array of line start indices
   * @private
   */
  private getLineStarts(text: string): number[] {
    const starts = [0];

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        starts.push(i + 1);
      }
    }

    return starts;
  }

  /**
   * Gets line and column for an index
   * @param index - Character index
   * @param lineStarts - Array of line start indices
   * @returns Line and column numbers (1-indexed)
   * @private
   */
  private getLineAndColumn(index: number, lineStarts: number[]): { line: number; column: number } {
    let line = 1;

    for (let i = lineStarts.length - 1; i >= 0; i--) {
      const start = lineStarts[i];
      if (start !== undefined && start <= index) {
        line = i + 1;
        return {
          line,
          column: index - start + 1,
        };
      }
    }

    return { line: 1, column: index + 1 };
  }

  /**
   * Searches for a group of patterns of the same length
   * @param text - Text to search
   * @param patterns - Patterns of same length
   * @param length - Pattern length
   * @returns Map of pattern to matches
   * @private
   */
  private searchPatternGroup(
    text: string,
    patterns: string[],
    length: number,
  ): Map<string, PatternMatch[]> {
    const results = new Map<string, PatternMatch[]>();
    const normalizedText = this.caseInsensitive ? text.toLowerCase() : text;

    // Initialize results
    for (const pattern of patterns) {
      results.set(pattern, []);
    }

    // Calculate pattern hashes
    const patternHashes = new Map<number, string[]>();
    for (const pattern of patterns) {
      const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;
      const hash = this.calculateHash(normalizedPattern, length);
      const existing = patternHashes.get(hash) ?? [];
      existing.push(pattern);
      patternHashes.set(hash, existing);
    }

    // Calculate initial text hash
    let textHash = this.calculateHash(normalizedText, length);
    let h = 1;
    for (let i = 0; i < length - 1; i++) {
      h = (h * BASE) % MOD;
    }

    const lineStarts = this.includeLineInfo ? this.getLineStarts(text) : [];

    // Slide through text
    for (let i = 0; i <= normalizedText.length - length; i++) {
      const matchingPatterns = patternHashes.get(textHash);

      if (matchingPatterns) {
        for (const pattern of matchingPatterns) {
          const normalizedPattern = this.caseInsensitive ? pattern.toLowerCase() : pattern;

          if (this.verifyMatch(normalizedText, normalizedPattern, i)) {
            const matches = results.get(pattern) ?? [];

            const match: PatternMatch = {
              index: i,
              match: text.substring(i, i + length),
            };

            if (this.includeLineInfo) {
              const lineInfo = this.getLineAndColumn(i, lineStarts);
              match.line = lineInfo.line;
              match.column = lineInfo.column;
            }

            matches.push(match);
            results.set(pattern, matches);
          }
        }
      }

      // Rolling hash
      if (i < normalizedText.length - length) {
        textHash = this.rollingHash(
          textHash,
          normalizedText.charCodeAt(i),
          normalizedText.charCodeAt(i + length),
          h,
        );
      }
    }

    return results;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Creates a case-insensitive Rabin-Karp matcher for document search
 *
 * @returns Configured Rabin-Karp matcher
 *
 * @example
 * ```typescript
 * const matcher = createDocumentMatcher();
 * const matches = matcher.search(foiaDocument, 'classified');
 * ```
 */
export function createDocumentMatcher(): RabinKarp {
  return new RabinKarp({
    caseInsensitive: true,
    includeLineInfo: true,
    maxMatches: 100,
  });
}

/**
 * Creates a Rabin-Karp matcher for PII detection
 *
 * @returns Configured Rabin-Karp matcher for sensitive data
 *
 * @example
 * ```typescript
 * const matcher = createPIIMatcher();
 * const ssnMatches = matcher.searchMultiple(text, [
 *   '123-45-6789',
 *   '987-65-4321'
 * ]);
 * ```
 */
export function createPIIMatcher(): RabinKarp {
  return new RabinKarp({
    caseInsensitive: false,
    includeLineInfo: true,
    maxMatches: 1000,
  });
}

/**
 * Quick search function for simple use cases
 *
 * @param text - Text to search in
 * @param pattern - Pattern to find
 * @param caseInsensitive - Whether to ignore case
 * @returns Array of match indices
 */
export function quickSearch(text: string, pattern: string, caseInsensitive = true): number[] {
  const matcher = new RabinKarp({ caseInsensitive, includeLineInfo: false });
  return matcher.search(text, pattern).map((m) => m.index);
}
