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
 * @file Agency Search Service with Trie-based Autocomplete
 * @module services/agency-search
 * @author FOIA Stream Team
 * @description Efficient O(k) prefix-based agency search using Trie data structure.
 *              Provides instant autocomplete suggestions as users type.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import {
  createAgencyHierarchy,
  createAgencyTrie,
  type Graph,
  type PathResult,
  type Trie,
  type TrieSearchResult,
} from '@foia-stream/shared';
import { db, schema } from '../db';
import type { Agency } from '../types';

// ============================================
// Types
// ============================================

/**
 * Agency data stored in the Trie
 */
export interface AgencyTrieData {
  /** Agency ID */
  id: string;
  /** Agency name */
  name: string;
  /** Agency abbreviation */
  abbreviation?: string;
  /** Jurisdiction level */
  jurisdictionLevel: 'federal' | 'state' | 'local';
  /** State code (for state/local agencies) */
  state?: string;
}

/**
 * Autocomplete result
 */
export interface AutocompleteResult {
  /** Agency ID */
  id: string;
  /** Agency name */
  name: string;
  /** Agency abbreviation */
  abbreviation?: string;
  /** Jurisdiction level */
  jurisdictionLevel: string;
  /** State (if applicable) */
  state?: string;
  /** Relevance score */
  score: number;
}

/**
 * Agency hierarchy search result
 */
export interface HierarchySearchResult {
  /** Agency ID */
  agencyId: string;
  /** Parent agencies (path to root) */
  parents: string[];
  /** Child agencies */
  children: string[];
  /** Sibling agencies */
  siblings: string[];
}

// ============================================
// Agency Search Service
// ============================================

/**
 * Agency Search Service using efficient data structures
 *
 * Features:
 * - O(k) prefix-based autocomplete using Trie
 * - Agency hierarchy navigation using Graph
 * - Automatic cache invalidation on data changes
 *
 * @example
 * ```typescript
 * const searchService = AgencySearchService.getInstance();
 *
 * // Fast autocomplete
 * const suggestions = await searchService.autocomplete('FBI');
 *
 * // Find agency path
 * const path = searchService.findAgencyPath('fbi', 'dea');
 * ```
 */
export class AgencySearchService {
  private static instance: AgencySearchService | null = null;

  /** Trie for agency name autocomplete */
  private nameTrie: Trie<AgencyTrieData>;

  /** Trie for abbreviation autocomplete */
  private abbreviationTrie: Trie<AgencyTrieData>;

  /** Graph for agency hierarchy */
  private hierarchy: Graph<string>;

  /** Whether the index is initialized */
  private initialized = false;

  /** Last index update timestamp */
  private lastUpdated: Date | null = null;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.nameTrie = createAgencyTrie<AgencyTrieData>();
    this.abbreviationTrie = createAgencyTrie<AgencyTrieData>();
    this.hierarchy = createAgencyHierarchy();
  }

  /**
   * Gets the singleton instance
   *
   * @returns AgencySearchService instance
   */
  static getInstance(): AgencySearchService {
    if (!AgencySearchService.instance) {
      AgencySearchService.instance = new AgencySearchService();
    }
    return AgencySearchService.instance;
  }

  /**
   * Initializes the search index from the database
   *
   * @returns Promise that resolves when indexing is complete
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.rebuildIndex();
    this.initialized = true;
  }

  /**
   * Rebuilds the entire search index
   * Call this after bulk data changes
   */
  async rebuildIndex(): Promise<void> {
    // Clear existing data
    this.nameTrie.clear();
    this.abbreviationTrie.clear();
    this.hierarchy.clear();

    // Fetch all agencies from database
    const agencies = await db.select().from(schema.agencies);

    // Build Trie indexes
    for (const agency of agencies) {
      const data: AgencyTrieData = {
        id: agency.id,
        name: agency.name,
        abbreviation: agency.abbreviation ?? undefined,
        jurisdictionLevel: agency.jurisdictionLevel as 'federal' | 'state' | 'local',
        state: agency.state ?? undefined,
      };

      // Index by name
      this.nameTrie.insert(agency.name, data);

      // Index by abbreviation if available
      if (agency.abbreviation) {
        this.abbreviationTrie.insert(agency.abbreviation, data);
      }

      // Add to hierarchy graph
      this.hierarchy.addVertex(agency.id, {
        name: agency.name,
        jurisdictionLevel: agency.jurisdictionLevel,
      });
    }

    // Build hierarchy edges (parent-child relationships)
    // Note: This assumes agencies have a parentAgencyId field
    // Adjust based on actual schema
    for (const agency of agencies) {
      const parentId = (agency as unknown as { parentAgencyId?: string }).parentAgencyId;
      if (parentId && this.hierarchy.hasVertex(parentId)) {
        this.hierarchy.addEdge(parentId, agency.id, 1, { relationship: 'parent-child' });
      }
    }

    this.lastUpdated = new Date();
  }

  /**
   * Performs autocomplete search
   *
   * @param query - Search query (prefix)
   * @param limit - Maximum results (default: 10)
   * @returns Array of matching agencies sorted by relevance
   *
   * @example
   * ```typescript
   * const results = await searchService.autocomplete('fed');
   * // Returns: Federal Bureau of Investigation, Federal Communications Commission, etc.
   * ```
   */
  async autocomplete(query: string, limit = 10): Promise<AutocompleteResult[]> {
    await this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Search both name and abbreviation tries
    const nameResults = this.nameTrie.searchByPrefix(trimmedQuery, limit);
    const abbrevResults = this.abbreviationTrie.searchByPrefix(trimmedQuery, limit);

    // Merge and deduplicate results
    const resultMap = new Map<string, AutocompleteResult>();

    // Add name matches
    for (const result of nameResults) {
      resultMap.set(result.data.id, this.toAutocompleteResult(result));
    }

    // Add abbreviation matches (higher score if exact match)
    for (const result of abbrevResults) {
      const existing = resultMap.get(result.data.id);
      if (existing) {
        // Boost score for abbreviation match
        existing.score += result.score * 2;
      } else {
        const autocompleteResult = this.toAutocompleteResult(result);
        autocompleteResult.score *= 2; // Abbreviation matches are often more relevant
        resultMap.set(result.data.id, autocompleteResult);
      }
    }

    // Sort by score and return
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Gets agencies matching exact abbreviation
   *
   * @param abbreviation - Abbreviation to search
   * @returns Matching agency or null
   */
  async findByAbbreviation(abbreviation: string): Promise<AgencyTrieData | null> {
    await this.ensureInitialized();
    return this.abbreviationTrie.search(abbreviation);
  }

  /**
   * Finds the path between two agencies in the hierarchy
   *
   * @param sourceId - Source agency ID
   * @param targetId - Target agency ID
   * @returns Path result with route and distance
   */
  findAgencyPath(sourceId: string, targetId: string): PathResult<string> {
    return this.hierarchy.findShortestPath(sourceId, targetId);
  }

  /**
   * Gets the hierarchy information for an agency
   *
   * @param agencyId - Agency ID
   * @returns Hierarchy information including parents, children, siblings
   */
  getAgencyHierarchy(agencyId: string): HierarchySearchResult {
    const result: HierarchySearchResult = {
      agencyId,
      parents: [],
      children: [],
      siblings: [],
    };

    if (!this.hierarchy.hasVertex(agencyId)) {
      return result;
    }

    // Get children (outgoing edges in directed graph)
    const children = this.hierarchy.getNeighbors(agencyId);
    result.children = children.map((e) => e.target);

    // Find parent by looking for vertices that have an edge to this agency
    const allVertices = this.hierarchy.getVertices();
    for (const vertex of allVertices) {
      const neighbors = this.hierarchy.getNeighbors(vertex);
      if (neighbors.some((e) => e.target === agencyId)) {
        result.parents.push(vertex);

        // Get siblings (other children of the same parent)
        const parentChildren = this.hierarchy.getNeighbors(vertex);
        for (const child of parentChildren) {
          if (child.target !== agencyId) {
            result.siblings.push(child.target);
          }
        }
      }
    }

    return result;
  }

  /**
   * Gets all agencies under a parent agency (recursive)
   *
   * @param parentId - Parent agency ID
   * @returns Array of all descendant agency IDs
   */
  getDescendants(parentId: string): string[] {
    const result = this.hierarchy.bfs(parentId);
    // Remove the parent itself
    return result.vertices.filter((v) => v !== parentId);
  }

  /**
   * Checks if the index needs to be refreshed
   *
   * @returns True if index is stale
   */
  isStale(): boolean {
    if (!this.lastUpdated) {
      return true;
    }

    // Consider stale if older than 5 minutes
    const staleThreshold = 5 * 60 * 1000;
    return Date.now() - this.lastUpdated.getTime() > staleThreshold;
  }

  /**
   * Gets search service statistics
   */
  getStats(): {
    nameTrieSize: number;
    abbreviationTrieSize: number;
    hierarchyVertices: number;
    hierarchyEdges: number;
    lastUpdated: Date | null;
    initialized: boolean;
  } {
    return {
      nameTrieSize: this.nameTrie.length,
      abbreviationTrieSize: this.abbreviationTrie.length,
      hierarchyVertices: this.hierarchy.vertexCount,
      hierarchyEdges: this.hierarchy.edgeCount,
      lastUpdated: this.lastUpdated,
      initialized: this.initialized,
    };
  }

  /**
   * Adds a single agency to the index
   * Call this after creating a new agency
   *
   * @param agency - Agency to add
   */
  addAgency(agency: Agency): void {
    const data: AgencyTrieData = {
      id: agency.id,
      name: agency.name,
      abbreviation: agency.abbreviation ?? undefined,
      jurisdictionLevel: agency.jurisdictionLevel as 'federal' | 'state' | 'local',
      state: agency.state ?? undefined,
    };

    this.nameTrie.insert(agency.name, data);

    if (agency.abbreviation) {
      this.abbreviationTrie.insert(agency.abbreviation, data);
    }

    this.hierarchy.addVertex(agency.id, {
      name: agency.name,
      jurisdictionLevel: agency.jurisdictionLevel,
    });
  }

  /**
   * Removes an agency from the index
   * Call this after deleting an agency
   *
   * @param agency - Agency to remove
   */
  removeAgency(agency: Agency): void {
    this.nameTrie.delete(agency.name);

    if (agency.abbreviation) {
      this.abbreviationTrie.delete(agency.abbreviation);
    }

    this.hierarchy.removeVertex(agency.id);
  }

  /**
   * Clears the singleton instance (for testing)
   */
  static resetInstance(): void {
    AgencySearchService.instance = null;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Ensures the index is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Converts Trie result to autocomplete result
   */
  private toAutocompleteResult(result: TrieSearchResult<AgencyTrieData>): AutocompleteResult {
    return {
      id: result.data.id,
      name: result.data.name,
      abbreviation: result.data.abbreviation,
      jurisdictionLevel: result.data.jurisdictionLevel,
      state: result.data.state,
      score: result.score,
    };
  }
}

// Export singleton instance
export const agencySearchService = AgencySearchService.getInstance();
