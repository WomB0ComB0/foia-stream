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
 * @file DSA Schema Validation Tests
 * @module tests/dsa/schemas
 * @author FOIA Stream Team
 */

import { describe, expect, it } from 'vitest';
import {
  FOIARequestPrioritySchema,
  GraphEdgeSchema,
  GraphOptionsSchema,
  PriorityQueueOptionsSchema,
  RabinKarpMultiSearchSchema,
  RabinKarpOptionsSchema,
  RabinKarpSearchSchema,
  TrieInsertSchema,
  TrieOptionsSchema,
  TrieSearchSchema,
  VertexIdSchema,
  validate,
  validateSafe,
} from '../../src/dsa/schemas';

describe('Schema Validation Helpers', () => {
  describe('validate', () => {
    it('should return validated data for valid input', () => {
      const result = validate(TrieOptionsSchema, { maxResults: 10 });
      expect(result.maxResults).toBe(10);
    });

    it('should throw for invalid input', () => {
      expect(() => validate(TrieOptionsSchema, { maxResults: -1 })).toThrow();
    });
  });

  describe('validateSafe', () => {
    it('should return success result for valid input', () => {
      const result = validateSafe(TrieOptionsSchema, { maxResults: 10 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxResults).toBe(10);
      }
    });

    it('should return error result for invalid input', () => {
      const result = validateSafe(TrieOptionsSchema, { maxResults: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });
});

describe('TrieOptionsSchema', () => {
  it('should validate valid options', () => {
    const result = validateSafe(TrieOptionsSchema, {
      caseInsensitive: true,
      maxResults: 20,
    });
    expect(result.success).toBe(true);
  });

  it('should allow empty options (use defaults)', () => {
    const result = validateSafe(TrieOptionsSchema, {});
    expect(result.success).toBe(true);
  });

  it('should reject negative maxResults', () => {
    const result = validateSafe(TrieOptionsSchema, { maxResults: -5 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer maxResults', () => {
    const result = validateSafe(TrieOptionsSchema, { maxResults: 5.5 });
    expect(result.success).toBe(false);
  });

  it('should reject zero maxResults', () => {
    const result = validateSafe(TrieOptionsSchema, { maxResults: 0 });
    expect(result.success).toBe(false);
  });
});

describe('TrieInsertSchema', () => {
  it('should validate valid word', () => {
    const result = validateSafe(TrieInsertSchema, { word: 'Federal Bureau' });
    expect(result.success).toBe(true);
  });

  it('should reject empty word', () => {
    const result = validateSafe(TrieInsertSchema, { word: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing word', () => {
    const result = validateSafe(TrieInsertSchema, {});
    expect(result.success).toBe(false);
  });
});

describe('TrieSearchSchema', () => {
  it('should validate prefix search', () => {
    const result = validateSafe(TrieSearchSchema, { prefix: 'Fed', limit: 10 });
    expect(result.success).toBe(true);
  });

  it('should allow prefix without limit', () => {
    const result = validateSafe(TrieSearchSchema, { prefix: 'Fed' });
    expect(result.success).toBe(true);
  });

  it('should reject negative limit', () => {
    const result = validateSafe(TrieSearchSchema, { prefix: 'Fed', limit: -1 });
    expect(result.success).toBe(false);
  });

  it('should allow empty prefix (handled by Trie implementation)', () => {
    // Note: Schema allows empty prefix; Trie.searchByPrefix handles empty prefix by returning []
    const result = validateSafe(TrieSearchSchema, { prefix: '' });
    expect(result.success).toBe(true);
  });
});

describe('PriorityQueueOptionsSchema', () => {
  it('should validate valid options', () => {
    const result = validateSafe(PriorityQueueOptionsSchema, {
      initialCapacity: 64,
    });
    expect(result.success).toBe(true);
  });

  it('should allow empty options', () => {
    const result = validateSafe(PriorityQueueOptionsSchema, {});
    expect(result.success).toBe(true);
  });

  it('should reject zero initialCapacity', () => {
    const result = validateSafe(PriorityQueueOptionsSchema, { initialCapacity: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject negative initialCapacity', () => {
    const result = validateSafe(PriorityQueueOptionsSchema, { initialCapacity: -16 });
    expect(result.success).toBe(false);
  });
});

describe('FOIARequestPrioritySchema', () => {
  it('should validate complete priority item', () => {
    const result = validateSafe(FOIARequestPrioritySchema, {
      id: 'req-001',
      dueDate: '2025-03-15',
      priority: 2,
      title: 'FOIA Request',
      agencyId: 'fbi',
    });
    expect(result.success).toBe(true);
  });

  it('should validate with Date object', () => {
    const result = validateSafe(FOIARequestPrioritySchema, {
      id: 'req-001',
      dueDate: new Date('2025-03-15'),
    });
    expect(result.success).toBe(true);
  });

  it('should allow optional fields', () => {
    const result = validateSafe(FOIARequestPrioritySchema, {
      id: 'req-001',
      dueDate: '2025-03-15',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty id', () => {
    const result = validateSafe(FOIARequestPrioritySchema, {
      id: '',
      dueDate: '2025-03-15',
    });
    expect(result.success).toBe(false);
  });

  it('should reject priority out of range (too low)', () => {
    const result = validateSafe(FOIARequestPrioritySchema, {
      id: 'req-001',
      dueDate: '2025-03-15',
      priority: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject priority out of range (too high)', () => {
    const result = validateSafe(FOIARequestPrioritySchema, {
      id: 'req-001',
      dueDate: '2025-03-15',
      priority: 6,
    });
    expect(result.success).toBe(false);
  });
});

describe('RabinKarpOptionsSchema', () => {
  it('should validate valid options', () => {
    const result = validateSafe(RabinKarpOptionsSchema, {
      caseInsensitive: true,
      maxMatches: 100,
      includeLineInfo: false,
    });
    expect(result.success).toBe(true);
  });

  it('should allow empty options', () => {
    const result = validateSafe(RabinKarpOptionsSchema, {});
    expect(result.success).toBe(true);
  });

  it('should reject negative maxMatches', () => {
    const result = validateSafe(RabinKarpOptionsSchema, { maxMatches: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject zero maxMatches', () => {
    const result = validateSafe(RabinKarpOptionsSchema, { maxMatches: 0 });
    expect(result.success).toBe(false);
  });
});

describe('RabinKarpSearchSchema', () => {
  it('should validate valid search', () => {
    const result = validateSafe(RabinKarpSearchSchema, {
      text: 'The quick brown fox',
      pattern: 'quick',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty text', () => {
    const result = validateSafe(RabinKarpSearchSchema, {
      text: '',
      pattern: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty pattern', () => {
    const result = validateSafe(RabinKarpSearchSchema, {
      text: 'Hello',
      pattern: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('RabinKarpMultiSearchSchema', () => {
  it('should validate valid multi-search', () => {
    const result = validateSafe(RabinKarpMultiSearchSchema, {
      text: 'The quick brown fox',
      patterns: ['quick', 'brown', 'fox'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty text', () => {
    const result = validateSafe(RabinKarpMultiSearchSchema, {
      text: '',
      patterns: ['test'],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty patterns array', () => {
    const result = validateSafe(RabinKarpMultiSearchSchema, {
      text: 'Hello',
      patterns: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('GraphOptionsSchema', () => {
  it('should validate directed option', () => {
    const result = validateSafe(GraphOptionsSchema, { directed: true });
    expect(result.success).toBe(true);
  });

  it('should allow empty options', () => {
    const result = validateSafe(GraphOptionsSchema, {});
    expect(result.success).toBe(true);
  });
});

describe('GraphEdgeSchema', () => {
  it('should validate valid edge', () => {
    const result = validateSafe(GraphEdgeSchema, {
      source: 'DOJ',
      target: 'FBI',
      weight: 5,
    });
    expect(result.success).toBe(true);
  });

  it('should allow default weight', () => {
    const result = validateSafe(GraphEdgeSchema, {
      source: 'DOJ',
      target: 'FBI',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty source', () => {
    const result = validateSafe(GraphEdgeSchema, {
      source: '',
      target: 'FBI',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty target', () => {
    const result = validateSafe(GraphEdgeSchema, {
      source: 'DOJ',
      target: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept negative weight (schema only validates finite numbers)', () => {
    // Note: Schema only requires finite number; Graph.addEdge handles edge weight semantics
    const result = validateSafe(GraphEdgeSchema, {
      source: 'DOJ',
      target: 'FBI',
      weight: -1,
    });
    expect(result.success).toBe(true);
  });
});

describe('VertexIdSchema', () => {
  it('should validate valid vertex ID', () => {
    const result = validateSafe(VertexIdSchema, 'DOJ');
    expect(result.success).toBe(true);
  });

  it('should reject empty vertex ID', () => {
    const result = validateSafe(VertexIdSchema, '');
    expect(result.success).toBe(false);
  });
});
