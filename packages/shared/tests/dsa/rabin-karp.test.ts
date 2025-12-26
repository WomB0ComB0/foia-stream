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
 * @file Rabin-Karp String Matching Algorithm Tests
 * @module tests/dsa/rabin-karp
 * @author FOIA Stream Team
 */

import { describe, expect, it } from 'vitest';
import { RabinKarp } from '../../src/dsa/rabin-karp';

describe('RabinKarp', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const matcher = new RabinKarp();
      expect(matcher).toBeInstanceOf(RabinKarp);
    });

    it('should accept custom options', () => {
      const matcher = new RabinKarp({
        caseInsensitive: true,
        maxMatches: 10,
        includeLineInfo: false,
      });
      expect(matcher).toBeInstanceOf(RabinKarp);
    });

    it('should throw error for invalid maxMatches', () => {
      expect(() => new RabinKarp({ maxMatches: -1 })).toThrow();
      expect(() => new RabinKarp({ maxMatches: 0 })).toThrow();
    });
  });

  describe('search', () => {
    it('should find single pattern match', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('The quick brown fox', 'quick');
      expect(matches.length).toBe(1);
      expect(matches[0]?.index).toBe(4);
      expect(matches[0]?.match).toBe('quick');
    });

    it('should find multiple occurrences', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('aba aba aba', 'aba');
      expect(matches.length).toBe(3);
    });

    it('should return empty array for no match', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('Hello world', 'xyz');
      expect(matches.length).toBe(0);
    });

    it('should return empty for pattern longer than text', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('Hi', 'Hello world');
      expect(matches.length).toBe(0);
    });

    it('should return empty for empty text', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('', 'test');
      expect(matches.length).toBe(0);
    });

    it('should return empty for empty pattern', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('Hello', '');
      expect(matches.length).toBe(0);
    });

    it('should perform case-insensitive search when enabled', () => {
      const matcher = new RabinKarp({ caseInsensitive: true });
      const matches = matcher.search('FBI and fbi and Fbi', 'FBI');
      expect(matches.length).toBe(3);
    });

    it('should be case-sensitive by default', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('FBI and fbi', 'fbi');
      expect(matches.length).toBe(1);
      expect(matches[0]?.index).toBe(8);
    });

    it('should respect maxMatches option', () => {
      const matcher = new RabinKarp({ maxMatches: 2 });
      const matches = matcher.search('aaa aaa aaa aaa', 'aaa');
      expect(matches.length).toBe(2);
    });

    it('should include line and column info by default', () => {
      const matcher = new RabinKarp();
      const text = 'Line 1\nLine 2 with pattern\nLine 3';
      const matches = matcher.search(text, 'pattern');
      expect(matches.length).toBe(1);
      expect(matches[0]?.line).toBe(2);
      expect(matches[0]?.column).toBeGreaterThan(0);
    });

    it('should handle overlapping patterns', () => {
      const matcher = new RabinKarp();
      const matches = matcher.search('aaaa', 'aa');
      expect(matches.length).toBe(3); // positions 0, 1, 2
    });
  });

  describe('searchMultiple', () => {
    it('should search for multiple patterns', () => {
      const matcher = new RabinKarp();
      const text = 'The quick brown fox jumps over the lazy dog';
      const results = matcher.searchMultiple(text, ['quick', 'fox', 'dog']);

      expect(results.size).toBe(3);
      expect(results.get('quick')?.length).toBe(1);
      expect(results.get('fox')?.length).toBe(1);
      expect(results.get('dog')?.length).toBe(1);
    });

    it('should handle patterns not found', () => {
      const matcher = new RabinKarp();
      const results = matcher.searchMultiple('Hello world', ['xyz', 'abc']);
      expect(results.get('xyz')?.length ?? 0).toBe(0);
      expect(results.get('abc')?.length ?? 0).toBe(0);
    });

    it('should handle empty patterns array', () => {
      const matcher = new RabinKarp();
      const results = matcher.searchMultiple('Hello world', []);
      expect(results.size).toBe(0);
    });

    it('should filter patterns longer than text', () => {
      const matcher = new RabinKarp();
      const results = matcher.searchMultiple('Hi', ['Hello world', 'Hi']);
      expect(results.get('Hi')?.length).toBe(1);
      // Pattern longer than text should be empty or not present
    });
  });

  describe('searchWithStats', () => {
    it('should return matches with statistics', () => {
      const matcher = new RabinKarp();
      const { matches, stats } = matcher.searchWithStats('The quick brown fox', 'quick');

      expect(matches.length).toBe(1);
      expect(stats.matchesFound).toBe(1);
      expect(stats.charactersProcessed).toBeGreaterThan(0);
      expect(typeof stats.timeTakenMs).toBe('number');
    });

    it('should track hash collisions', () => {
      const matcher = new RabinKarp();
      const { stats } = matcher.searchWithStats('The quick brown fox jumps', 'fox');
      expect(typeof stats.hashCollisions).toBe('number');
    });

    it('should handle empty inputs', () => {
      const matcher = new RabinKarp();
      const { matches, stats } = matcher.searchWithStats('', 'test');
      expect(matches.length).toBe(0);
      expect(stats.charactersProcessed).toBe(0);
    });
  });

  describe('FOIA document search scenarios', () => {
    it('should find classified terms in document', () => {
      const matcher = new RabinKarp({ caseInsensitive: true });
      const document = `
        This document contains CONFIDENTIAL information.
        Some parts are CLASSIFIED as TOP SECRET.
        Review required for RESTRICTED sections.
      `;
      const results = matcher.searchMultiple(document, [
        'confidential',
        'classified',
        'top secret',
        'restricted',
      ]);

      expect(results.get('confidential')?.length).toBe(1);
      expect(results.get('classified')?.length).toBe(1);
      expect(results.get('top secret')?.length).toBe(1);
      expect(results.get('restricted')?.length).toBe(1);
    });

    it('should find PII patterns', () => {
      const matcher = new RabinKarp();
      const document = 'Contact: john.doe@agency.gov or jane.smith@agency.gov';
      const matches = matcher.search(document, '@agency.gov');
      expect(matches.length).toBe(2);
    });

    it('should handle large text efficiently', () => {
      const matcher = new RabinKarp();
      const largeText = 'Lorem ipsum '.repeat(10000) + 'FOIA REQUEST';
      const { stats } = matcher.searchWithStats(largeText, 'FOIA REQUEST');
      expect(stats.matchesFound).toBe(1);
      expect(stats.timeTakenMs).toBeLessThan(1000); // Should complete quickly
    });
  });
});
