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
 * @file Trie Data Structure Tests
 * @module tests/dsa/trie
 * @author FOIA Stream Team
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createAgencyTrie, Trie } from '../../src/dsa/trie';

interface TestAgency {
  id: string;
  name: string;
  abbreviation?: string;
}

describe('Trie', () => {
  let trie: Trie<TestAgency>;

  beforeEach(() => {
    trie = new Trie<TestAgency>();
  });

  describe('constructor', () => {
    it('should create a Trie with default options', () => {
      const t = new Trie<string>();
      expect(t.length).toBe(0);
    });

    it('should create a Trie with custom options', () => {
      const t = new Trie<string>({ caseInsensitive: false, maxResults: 5 });
      expect(t.length).toBe(0);
    });

    it('should throw error for invalid maxResults', () => {
      expect(() => new Trie<string>({ maxResults: -1 })).toThrow();
      expect(() => new Trie<string>({ maxResults: 0 })).toThrow();
      expect(() => new Trie<string>({ maxResults: 1.5 })).toThrow();
    });
  });

  describe('insert', () => {
    it('should insert a word with data', () => {
      const agency: TestAgency = { id: 'fbi', name: 'FBI' };
      trie.insert('Federal Bureau of Investigation', agency);
      expect(trie.length).toBe(1);
    });

    it('should handle empty string gracefully', () => {
      trie.insert('', { id: 'test', name: 'Test' });
      expect(trie.length).toBe(0);
    });

    it('should handle whitespace-only string', () => {
      trie.insert('   ', { id: 'test', name: 'Test' });
      expect(trie.length).toBe(0);
    });

    it('should support method chaining', () => {
      const result = trie
        .insert('FBI', { id: 'fbi', name: 'FBI' })
        .insert('CIA', { id: 'cia', name: 'CIA' });
      expect(result).toBe(trie);
      expect(trie.length).toBe(2);
    });

    it('should update data for existing word', () => {
      trie.insert('FBI', { id: 'fbi', name: 'FBI' });
      trie.insert('FBI', { id: 'fbi-updated', name: 'FBI Updated' });
      expect(trie.length).toBe(1);
      const result = trie.search('FBI');
      expect(result?.id).toBe('fbi-updated');
    });
  });

  describe('insertMany', () => {
    it('should insert multiple words at once', () => {
      trie.insertMany([
        ['FBI', { id: 'fbi', name: 'FBI' }],
        ['CIA', { id: 'cia', name: 'CIA' }],
        ['NSA', { id: 'nsa', name: 'NSA' }],
      ]);
      expect(trie.length).toBe(3);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      trie.insert('Federal Bureau of Investigation', { id: 'fbi', name: 'FBI' });
      trie.insert('Federal Communications Commission', { id: 'fcc', name: 'FCC' });
      trie.insert('Central Intelligence Agency', { id: 'cia', name: 'CIA' });
    });

    it('should find exact match', () => {
      const result = trie.search('Federal Bureau of Investigation');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('fbi');
    });

    it('should return null for non-existent word', () => {
      const result = trie.search('Department of Justice');
      expect(result).toBeNull();
    });

    it('should be case-insensitive by default', () => {
      const result = trie.search('FEDERAL BUREAU OF INVESTIGATION');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('fbi');
    });
  });

  describe('searchByPrefix', () => {
    beforeEach(() => {
      trie.insert('Federal Bureau of Investigation', { id: 'fbi', name: 'FBI' });
      trie.insert('Federal Communications Commission', { id: 'fcc', name: 'FCC' });
      trie.insert('Federal Trade Commission', { id: 'ftc', name: 'FTC' });
      trie.insert('Central Intelligence Agency', { id: 'cia', name: 'CIA' });
    });

    it('should find all words with prefix', () => {
      const results = trie.searchByPrefix('federal');
      expect(results.length).toBe(3);
    });

    it('should respect limit parameter', () => {
      const results = trie.searchByPrefix('federal', 2);
      expect(results.length).toBe(2);
    });

    it('should return empty for non-existent prefix', () => {
      const results = trie.searchByPrefix('xyz');
      expect(results.length).toBe(0);
    });

    it('should return empty for empty prefix', () => {
      const results = trie.searchByPrefix('');
      expect(results.length).toBe(0);
    });

    it('should return results with score property', () => {
      const results = trie.searchByPrefix('federal');
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result).toHaveProperty('word');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      }
    });

    it('should sort by frequency score (descending)', () => {
      const results = trie.searchByPrefix('federal');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
      }
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      trie.insert('FBI', { id: 'fbi', name: 'FBI' });
      trie.insert('FCC', { id: 'fcc', name: 'FCC' });
    });

    it('should delete a word', () => {
      // Note: delete() returns whether the node can be pruned, not whether deletion was successful
      // The actual deletion is verified by checking has() and length
      trie.delete('FBI');
      expect(trie.length).toBe(1);
      expect(trie.search('FBI')).toBeNull();
    });

    it('should return false for non-existent word', () => {
      expect(trie.delete('CIA')).toBe(false);
      expect(trie.length).toBe(2);
    });

    it('should handle empty string', () => {
      expect(trie.delete('')).toBe(false);
    });
  });

  describe('has', () => {
    beforeEach(() => {
      trie.insert('FBI', { id: 'fbi', name: 'FBI' });
    });

    it('should return true for existing word', () => {
      expect(trie.has('FBI')).toBe(true);
    });

    it('should return false for non-existent word', () => {
      expect(trie.has('CIA')).toBe(false);
    });

    it('should be case-insensitive by default', () => {
      expect(trie.has('fbi')).toBe(true);
    });
  });

  describe('startsWith', () => {
    beforeEach(() => {
      trie.insert('Federal Bureau of Investigation', { id: 'fbi', name: 'FBI' });
    });

    it('should return true for valid prefix', () => {
      expect(trie.startsWith('Fed')).toBe(true);
      expect(trie.startsWith('Federal')).toBe(true);
    });

    it('should return false for invalid prefix', () => {
      expect(trie.startsWith('xyz')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all words', () => {
      trie.insert('FBI', { id: 'fbi', name: 'FBI' });
      trie.insert('CIA', { id: 'cia', name: 'CIA' });
      trie.clear();
      expect(trie.length).toBe(0);
      expect(trie.has('FBI')).toBe(false);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-insensitive by default', () => {
      trie.insert('FBI', { id: 'fbi', name: 'FBI' });
      expect(trie.search('fbi')).not.toBeNull();
      expect(trie.search('FBI')).not.toBeNull();
      expect(trie.search('Fbi')).not.toBeNull();
    });

    it('should be case-sensitive when configured', () => {
      const caseSensitiveTrie = new Trie<TestAgency>({ caseInsensitive: false });
      caseSensitiveTrie.insert('FBI', { id: 'fbi', name: 'FBI' });
      expect(caseSensitiveTrie.search('FBI')).not.toBeNull();
      expect(caseSensitiveTrie.search('fbi')).toBeNull();
    });
  });

  describe('getAllWords', () => {
    it('should return all words in the trie', () => {
      trie.insert('FBI', { id: 'fbi', name: 'FBI' });
      trie.insert('CIA', { id: 'cia', name: 'CIA' });
      trie.insert('NSA', { id: 'nsa', name: 'NSA' });

      const words = trie.getAllWords();
      expect(words.length).toBe(3);
    });
  });
});

interface FullAgency {
  id: string;
  name: string;
  abbreviation: string;
  jurisdictionLevel: 'federal' | 'state' | 'local';
}

describe('createAgencyTrie', () => {
  it('should create a trie optimized for agency search', () => {
    const trie = createAgencyTrie<FullAgency>();
    expect(trie).toBeInstanceOf(Trie);
  });

  it('should work with agency data', () => {
    const trie = createAgencyTrie<FullAgency>();
    trie.insert('Federal Bureau of Investigation', {
      id: 'fbi',
      name: 'Federal Bureau of Investigation',
      abbreviation: 'FBI',
      jurisdictionLevel: 'federal',
    });

    const results = trie.searchByPrefix('fed');
    expect(results.length).toBe(1);
    expect(results[0]?.data.abbreviation).toBe('FBI');
  });
});
