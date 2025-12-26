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
 * @file Data Structures & Algorithms Module
 * @module dsa
 * @author FOIA Stream Team
 * @description Collection of efficient data structures for FOIA Stream.
 *
 * Includes:
 * - **Trie**: O(k) prefix-based agency search autocomplete
 * - **Priority Queue**: O(log n) request prioritization by deadline/urgency
 * - **Rabin-Karp**: O(n+m) pattern matching for document search
 * - **Graph**: O(V+E) agency hierarchy and request routing
 */

// ============================================
// Trie - Prefix Tree for Autocomplete
// ============================================

export {
  createAgencyTrie,
  Trie,
  type TrieOptions,
  type TrieSearchResult,
} from './trie';

// ============================================
// Priority Queue - Request Prioritization
// ============================================

export {
  type CompareFn,
  createDeadlineQueue,
  createMaxHeap,
  createMinHeap,
  createPriorityLevelQueue,
  PriorityQueue,
  type PriorityQueueOptions,
  type PriorityQueueStats,
  type PriorityRequestItem,
  validatePriorityItem,
} from './priority-queue';

// ============================================
// Rabin-Karp - Pattern Matching
// ============================================

export {
  createDocumentMatcher,
  createPIIMatcher,
  type PatternMatch,
  quickSearch,
  RabinKarp,
  type RabinKarpOptions,
  type SearchStats,
} from './rabin-karp';

// ============================================
// Graph - Agency Hierarchy & Routing
// ============================================

export {
  type AgencyNode,
  addValidatedEdge,
  buildAgencyHierarchy,
  createAgencyHierarchy,
  createRequestRoutingGraph,
  type Edge,
  Graph,
  type GraphOptions,
  isValidVertexId,
  type PathResult,
  type TraversalResult,
  type Vertex,
} from './graph';

// ============================================
// Effect Schema Validation Schemas
// ============================================

export {
  // Types
  type AgencyAutocompleteData,
  // Agency-specific schemas
  AgencyAutocompleteDataSchema,
  type AgencyHierarchyNode,
  AgencyHierarchyNodeSchema,
  createValidator,
  type FOIARequestPriority,
  FOIARequestPrioritySchema,
  type GraphEdge,
  GraphEdgeSchema,
  // Graph schemas
  GraphOptionsSchema,
  // Priority Queue schemas
  PriorityQueueOptionsSchema,
  type RabinKarpMultiSearch,
  RabinKarpMultiSearchSchema,
  // Rabin-Karp schemas
  RabinKarpOptionsSchema,
  type RabinKarpSearch,
  RabinKarpSearchSchema,
  type TrieInsert,
  TrieInsertSchema,
  // Trie schemas
  TrieOptionsSchema,
  type TrieSearch,
  TrieSearchSchema,
  type VertexId,
  VertexIdSchema,
  // Validation helpers
  validate,
  validateSafe,
} from './schemas';
