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
 * @file Trie (Prefix Tree) Data Structure
 * @module dsa/trie
 * @author FOIA Stream Team
 * @description Efficient prefix-based search for agency autocomplete.
 *              Provides O(k) lookup where k is the prefix length.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

// ============================================
// Types & Interfaces
// ============================================

/**
 * Represents a node in the Trie
 * @template T - Type of data stored at word endings
 */
interface TrieNode<T> {
  /** Child nodes mapped by character */
  children: Map<string, TrieNode<T>>;
  /** Whether this node marks the end of a word */
  isEndOfWord: boolean;
  /** Data associated with the word (if end of word) */
  data: T | null;
  /** Number of words passing through this node (for ranking) */
  frequency: number;
}

/**
 * Search result with relevance score
 * @template T - Type of stored data
 */
export interface TrieSearchResult<T> {
  /** The matched word */
  word: string;
  /** Associated data */
  data: T;
  /** Relevance score based on frequency */
  score: number;
}

/**
 * Options for Trie configuration
 */
export interface TrieOptions {
  /** Whether to make searches case-insensitive (default: true) */
  caseInsensitive?: boolean;
  /** Maximum results to return from search (default: 10) */
  maxResults?: number;
}

// ============================================
// Trie Implementation
// ============================================

/**
 * Trie (Prefix Tree) for efficient prefix-based autocomplete
 *
 * Time Complexity:
 * - insert: O(k) where k is word length
 * - search: O(k) for exact match
 * - startsWith: O(k + m) where m is number of results
 * - delete: O(k)
 *
 * Space Complexity: O(ALPHABET_SIZE * k * n) where n is number of words
 *
 * @template T - Type of data stored with each word
 *
 * @example
 * ```typescript
 * const trie = new Trie<Agency>();
 *
 * trie.insert('Federal Bureau of Investigation', { id: 'fbi', ... });
 * trie.insert('Federal Communications Commission', { id: 'fcc', ... });
 *
 * const results = trie.searchByPrefix('federal');
 * // Returns both FBI and FCC with relevance scores
 * ```
 */
export class Trie<T> {
  private root: TrieNode<T>;
  private readonly caseInsensitive: boolean;
  private readonly maxResults: number;
  private size: number;

  /**
   * Creates a new Trie instance
   * @param options - Configuration options
   */
  constructor(options: TrieOptions = {}) {
    this.root = this.createNode();
    this.caseInsensitive = options.caseInsensitive ?? true;
    this.maxResults = options.maxResults ?? 10;
    this.size = 0;
  }

  /**
   * Creates a new Trie node
   * @returns Empty Trie node
   * @private
   */
  private createNode(): TrieNode<T> {
    return {
      children: new Map(),
      isEndOfWord: false,
      data: null,
      frequency: 0,
    };
  }

  /**
   * Normalizes a key based on case sensitivity setting
   * @param key - The key to normalize
   * @returns Normalized key
   * @private
   */
  private normalizeKey(key: string): string {
    return this.caseInsensitive ? key.toLowerCase() : key;
  }

  /**
   * Inserts a word with associated data into the Trie
   *
   * @param word - The word to insert
   * @param data - Data to associate with the word
   * @returns This Trie instance for chaining
   *
   * @example
   * ```typescript
   * trie.insert('Department of Justice', { id: 'doj', name: 'DOJ' });
   * ```
   */
  insert(word: string, data: T): this {
    if (!word || word.trim() === '') {
      return this;
    }

    const normalizedWord = this.normalizeKey(word.trim());
    let current = this.root;

    for (const char of normalizedWord) {
      if (!current.children.has(char)) {
        current.children.set(char, this.createNode());
      }
      const next = current.children.get(char);
      if (next) {
        current = next;
        current.frequency++;
      }
    }

    if (!current.isEndOfWord) {
      this.size++;
    }

    current.isEndOfWord = true;
    current.data = data;

    return this;
  }

  /**
   * Bulk insert multiple words with data
   *
   * @param entries - Array of [word, data] tuples
   * @returns This Trie instance for chaining
   *
   * @example
   * ```typescript
   * trie.insertMany([
   *   ['FBI', { id: 'fbi' }],
   *   ['CIA', { id: 'cia' }],
   * ]);
   * ```
   */
  insertMany(entries: Array<[string, T]>): this {
    for (const [word, data] of entries) {
      this.insert(word, data);
    }
    return this;
  }

  /**
   * Searches for an exact word match
   *
   * @param word - The word to search for
   * @returns The associated data or null if not found
   *
   * @example
   * ```typescript
   * const agency = trie.search('FBI');
   * ```
   */
  search(word: string): T | null {
    const node = this.findNode(word);
    return node?.isEndOfWord ? node.data : null;
  }

  /**
   * Checks if a word exists in the Trie
   *
   * @param word - The word to check
   * @returns True if the word exists
   */
  has(word: string): boolean {
    const node = this.findNode(word);
    return node?.isEndOfWord ?? false;
  }

  /**
   * Checks if any word starts with the given prefix
   *
   * @param prefix - The prefix to check
   * @returns True if any word starts with the prefix
   */
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  /**
   * Finds all words starting with the given prefix
   *
   * @param prefix - The prefix to search for
   * @param limit - Maximum number of results (defaults to maxResults option)
   * @returns Array of search results sorted by relevance
   *
   * @example
   * ```typescript
   * const results = trie.searchByPrefix('fed');
   * // Returns agencies starting with 'fed', sorted by frequency
   * ```
   */
  searchByPrefix(prefix: string, limit?: number): TrieSearchResult<T>[] {
    const maxCount = limit ?? this.maxResults;
    const normalizedPrefix = this.normalizeKey(prefix.trim());

    if (!normalizedPrefix) {
      return [];
    }

    const prefixNode = this.findNode(prefix);
    if (!prefixNode) {
      return [];
    }

    const results: TrieSearchResult<T>[] = [];
    this.collectWords(prefixNode, normalizedPrefix, results, maxCount);

    // Sort by frequency (higher = more relevant)
    return results.sort((a, b) => b.score - a.score).slice(0, maxCount);
  }

  /**
   * Deletes a word from the Trie
   *
   * @param word - The word to delete
   * @returns True if the word was deleted
   */
  delete(word: string): boolean {
    const normalizedWord = this.normalizeKey(word.trim());
    if (!normalizedWord) {
      return false;
    }

    return this.deleteRecursive(this.root, normalizedWord, 0);
  }

  /**
   * Returns the number of words in the Trie
   */
  get length(): number {
    return this.size;
  }

  /**
   * Clears all words from the Trie
   */
  clear(): void {
    this.root = this.createNode();
    this.size = 0;
  }

  /**
   * Gets all words in the Trie
   * @returns Array of all words with their data
   */
  getAllWords(): Array<{ word: string; data: T }> {
    const results: TrieSearchResult<T>[] = [];
    this.collectWords(this.root, '', results, Number.MAX_SAFE_INTEGER);
    return results.map(({ word, data }) => ({ word, data }));
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Finds the node for a given word/prefix
   * @param word - The word or prefix to find
   * @returns The node or null if not found
   * @private
   */
  private findNode(word: string): TrieNode<T> | null {
    const normalizedWord = this.normalizeKey(word.trim());
    if (!normalizedWord) {
      return null;
    }

    let current = this.root;

    for (const char of normalizedWord) {
      const next = current.children.get(char);
      if (!next) {
        return null;
      }
      current = next;
    }

    return current;
  }

  /**
   * Collects all words from a node using DFS
   * @param node - Starting node
   * @param currentWord - Current word being built
   * @param results - Results array to populate
   * @param limit - Maximum results to collect
   * @private
   */
  private collectWords(
    node: TrieNode<T>,
    currentWord: string,
    results: TrieSearchResult<T>[],
    limit: number,
  ): void {
    if (results.length >= limit) {
      return;
    }

    if (node.isEndOfWord && node.data !== null) {
      results.push({
        word: currentWord,
        data: node.data,
        score: node.frequency,
      });
    }

    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, currentWord + char, results, limit);
    }
  }

  /**
   * Recursively deletes a word from the Trie
   * @param node - Current node
   * @param word - Word to delete
   * @param index - Current character index
   * @returns True if the parent should delete this node
   * @private
   */
  private deleteRecursive(node: TrieNode<T>, word: string, index: number): boolean {
    if (index === word.length) {
      if (!node.isEndOfWord) {
        return false;
      }

      node.isEndOfWord = false;
      node.data = null;
      this.size--;

      return node.children.size === 0;
    }

    const char = word[index];
    if (char === undefined) {
      return false;
    }

    const childNode = node.children.get(char);

    if (!childNode) {
      return false;
    }

    const shouldDeleteChild = this.deleteRecursive(childNode, word, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);
      return !node.isEndOfWord && node.children.size === 0;
    }

    childNode.frequency--;
    return false;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Creates a pre-configured Trie for agency search
 *
 * @returns Trie configured for agency autocomplete
 *
 * @example
 * ```typescript
 * const agencyTrie = createAgencyTrie();
 * agencyTrie.insert('FBI', { id: 'fbi', name: 'Federal Bureau of Investigation' });
 * ```
 */
export function createAgencyTrie<T>(): Trie<T> {
  return new Trie<T>({
    caseInsensitive: true,
    maxResults: 10,
  });
}
