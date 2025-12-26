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
 * @file Graph Data Structure with BFS/DFS and Shortest Path
 * @module dsa/graph
 * @author FOIA Stream Team
 * @description Weighted directed graph for agency hierarchy and request routing.
 *              Supports BFS, DFS, Dijkstra's shortest path, and topological sort.
 * @compliance NIST 800-53 AC-4 (Information Flow Enforcement)
 */

// ============================================
// Types & Interfaces
// ============================================

/**
 * Edge in the graph
 */
export interface Edge<T> {
  /** Target vertex */
  target: T;
  /** Edge weight (default: 1) */
  weight: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Vertex with adjacency list
 */
export interface Vertex<T> {
  /** Vertex value/id */
  value: T;
  /** Outgoing edges */
  edges: Edge<T>[];
  /** Optional vertex metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Path result from shortest path algorithms
 */
export interface PathResult<T> {
  /** Ordered list of vertices in the path */
  path: T[];
  /** Total distance/weight of the path */
  distance: number;
  /** Whether a path was found */
  found: boolean;
}

/**
 * Graph traversal result
 */
export interface TraversalResult<T> {
  /** Vertices in traversal order */
  vertices: T[];
  /** Parent map for path reconstruction */
  parents: Map<T, T | null>;
  /** Distance from source (for BFS) */
  distances: Map<T, number>;
}

/**
 * Options for graph creation
 */
export interface GraphOptions {
  /** Whether the graph is directed (default: true) */
  directed?: boolean;
}

// ============================================
// Graph Implementation
// ============================================

/**
 * Weighted Graph with Adjacency List representation
 *
 * Supports both directed and undirected graphs with weighted edges.
 * Implements common graph algorithms including BFS, DFS, Dijkstra's shortest path.
 *
 * Time Complexity:
 * - addVertex: O(1)
 * - addEdge: O(1)
 * - removeVertex: O(V + E)
 * - removeEdge: O(E)
 * - BFS/DFS: O(V + E)
 * - Dijkstra: O((V + E) log V) with priority queue
 *
 * Space Complexity: O(V + E)
 *
 * @template T - Type of vertex identifiers
 *
 * @example
 * ```typescript
 * const graph = new Graph<string>();
 *
 * // Add agency hierarchy
 * graph.addVertex('DOJ');
 * graph.addVertex('FBI');
 * graph.addVertex('DEA');
 *
 * graph.addEdge('DOJ', 'FBI', 1);
 * graph.addEdge('DOJ', 'DEA', 1);
 *
 * // Find path from FBI to DEA through DOJ
 * const path = graph.findShortestPath('FBI', 'DEA');
 * ```
 */
export class Graph<T> {
  private adjacencyList: Map<T, Vertex<T>>;
  private readonly directed: boolean;

  /**
   * Creates a new Graph
   * @param options - Configuration options
   */
  constructor(options: GraphOptions = {}) {
    this.adjacencyList = new Map();
    this.directed = options.directed ?? true;
  }

  /**
   * Returns the number of vertices in the graph
   */
  get vertexCount(): number {
    return this.adjacencyList.size;
  }

  /**
   * Returns the total number of edges in the graph
   */
  get edgeCount(): number {
    let count = 0;
    for (const vertex of this.adjacencyList.values()) {
      count += vertex.edges.length;
    }
    return this.directed ? count : count / 2;
  }

  /**
   * Checks if the graph has a vertex
   * @param vertex - Vertex to check
   * @returns True if vertex exists
   */
  hasVertex(vertex: T): boolean {
    return this.adjacencyList.has(vertex);
  }

  /**
   * Checks if an edge exists between two vertices
   * @param source - Source vertex
   * @param target - Target vertex
   * @returns True if edge exists
   */
  hasEdge(source: T, target: T): boolean {
    const vertex = this.adjacencyList.get(source);
    if (!vertex) return false;
    return vertex.edges.some((edge) => edge.target === target);
  }

  /**
   * Adds a vertex to the graph
   *
   * @param vertex - Vertex to add
   * @param metadata - Optional metadata
   * @returns This graph for chaining
   */
  addVertex(vertex: T, metadata?: Record<string, unknown>): this {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, {
        value: vertex,
        edges: [],
        metadata,
      });
    }
    return this;
  }

  /**
   * Adds multiple vertices at once
   *
   * @param vertices - Vertices to add
   * @returns This graph for chaining
   */
  addVertices(vertices: T[]): this {
    for (const vertex of vertices) {
      this.addVertex(vertex);
    }
    return this;
  }

  /**
   * Adds an edge between two vertices
   *
   * @param source - Source vertex
   * @param target - Target vertex
   * @param weight - Edge weight (default: 1)
   * @param metadata - Optional edge metadata
   * @returns This graph for chaining
   */
  addEdge(source: T, target: T, weight = 1, metadata?: Record<string, unknown>): this {
    // Ensure vertices exist
    this.addVertex(source);
    this.addVertex(target);

    const sourceVertex = this.adjacencyList.get(source);
    if (sourceVertex) {
      // Check if edge already exists
      const existingEdge = sourceVertex.edges.find((e) => e.target === target);
      if (existingEdge) {
        existingEdge.weight = weight;
        existingEdge.metadata = metadata;
      } else {
        sourceVertex.edges.push({ target, weight, metadata });
      }
    }

    // For undirected graphs, add reverse edge
    if (!this.directed) {
      const targetVertex = this.adjacencyList.get(target);
      if (targetVertex) {
        const existingEdge = targetVertex.edges.find((e) => e.target === source);
        if (!existingEdge) {
          targetVertex.edges.push({ target: source, weight, metadata });
        }
      }
    }

    return this;
  }

  /**
   * Removes a vertex and all its edges
   *
   * @param vertex - Vertex to remove
   * @returns True if vertex was removed
   */
  removeVertex(vertex: T): boolean {
    if (!this.adjacencyList.has(vertex)) {
      return false;
    }

    // Remove all edges pointing to this vertex
    for (const v of this.adjacencyList.values()) {
      v.edges = v.edges.filter((edge) => edge.target !== vertex);
    }

    // Remove the vertex
    this.adjacencyList.delete(vertex);
    return true;
  }

  /**
   * Removes an edge between two vertices
   *
   * @param source - Source vertex
   * @param target - Target vertex
   * @returns True if edge was removed
   */
  removeEdge(source: T, target: T): boolean {
    const sourceVertex = this.adjacencyList.get(source);
    if (!sourceVertex) return false;

    const initialLength = sourceVertex.edges.length;
    sourceVertex.edges = sourceVertex.edges.filter((e) => e.target !== target);

    if (!this.directed) {
      const targetVertex = this.adjacencyList.get(target);
      if (targetVertex) {
        targetVertex.edges = targetVertex.edges.filter((e) => e.target !== source);
      }
    }

    return sourceVertex.edges.length < initialLength;
  }

  /**
   * Gets all neighbors of a vertex
   *
   * @param vertex - Vertex to get neighbors for
   * @returns Array of neighbor vertices with edge weights
   */
  getNeighbors(vertex: T): Edge<T>[] {
    return this.adjacencyList.get(vertex)?.edges ?? [];
  }

  /**
   * Gets all vertices in the graph
   *
   * @returns Array of all vertices
   */
  getVertices(): T[] {
    return Array.from(this.adjacencyList.keys());
  }

  /**
   * Gets vertex metadata
   *
   * @param vertex - Vertex to get metadata for
   * @returns Vertex metadata or undefined
   */
  getVertexMetadata(vertex: T): Record<string, unknown> | undefined {
    return this.adjacencyList.get(vertex)?.metadata;
  }

  /**
   * Breadth-First Search traversal
   *
   * @param start - Starting vertex
   * @returns Traversal result with vertices, parents, and distances
   *
   * @example
   * ```typescript
   * const result = graph.bfs('DOJ');
   * console.log(result.vertices); // ['DOJ', 'FBI', 'DEA', ...]
   * ```
   */
  bfs(start: T): TraversalResult<T> {
    const vertices: T[] = [];
    const parents = new Map<T, T | null>();
    const distances = new Map<T, number>();
    const visited = new Set<T>();

    if (!this.adjacencyList.has(start)) {
      return { vertices, parents, distances };
    }

    const queue: T[] = [start];
    visited.add(start);
    parents.set(start, null);
    distances.set(start, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      vertices.push(current);
      const currentDistance = distances.get(current) ?? 0;

      const neighbors = this.getNeighbors(current);
      for (const edge of neighbors) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
          parents.set(edge.target, current);
          distances.set(edge.target, currentDistance + 1);
        }
      }
    }

    return { vertices, parents, distances };
  }

  /**
   * Depth-First Search traversal
   *
   * @param start - Starting vertex
   * @returns Traversal result with vertices and parents
   *
   * @example
   * ```typescript
   * const result = graph.dfs('DOJ');
   * ```
   */
  dfs(start: T): TraversalResult<T> {
    const vertices: T[] = [];
    const parents = new Map<T, T | null>();
    const distances = new Map<T, number>();
    const visited = new Set<T>();

    if (!this.adjacencyList.has(start)) {
      return { vertices, parents, distances };
    }

    const dfsRecursive = (vertex: T, depth: number): void => {
      visited.add(vertex);
      vertices.push(vertex);
      distances.set(vertex, depth);

      const neighbors = this.getNeighbors(vertex);
      for (const edge of neighbors) {
        if (!visited.has(edge.target)) {
          parents.set(edge.target, vertex);
          dfsRecursive(edge.target, depth + 1);
        }
      }
    };

    parents.set(start, null);
    dfsRecursive(start, 0);

    return { vertices, parents, distances };
  }

  /**
   * Finds the shortest path between two vertices using Dijkstra's algorithm
   *
   * @param start - Starting vertex
   * @param end - Ending vertex
   * @returns Path result with vertices and total distance
   *
   * @example
   * ```typescript
   * const result = graph.findShortestPath('FBI', 'IRS');
   * if (result.found) {
   *   console.log(`Path: ${result.path.join(' -> ')}`);
   *   console.log(`Distance: ${result.distance}`);
   * }
   * ```
   */
  findShortestPath(start: T, end: T): PathResult<T> {
    if (!this.adjacencyList.has(start) || !this.adjacencyList.has(end)) {
      return { path: [], distance: Number.POSITIVE_INFINITY, found: false };
    }

    if (start === end) {
      return { path: [start], distance: 0, found: true };
    }

    const distances = new Map<T, number>();
    const parents = new Map<T, T | null>();
    const visited = new Set<T>();

    // Initialize distances
    for (const vertex of this.adjacencyList.keys()) {
      distances.set(vertex, Number.POSITIVE_INFINITY);
    }
    distances.set(start, 0);
    parents.set(start, null);

    // Priority queue (simple implementation using sorted array)
    const queue: Array<{ vertex: T; distance: number }> = [{ vertex: start, distance: 0 }];

    while (queue.length > 0) {
      // Get vertex with minimum distance
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift();
      if (!current) break;

      if (visited.has(current.vertex)) continue;
      visited.add(current.vertex);

      // Found the target
      if (current.vertex === end) {
        break;
      }

      const neighbors = this.getNeighbors(current.vertex);
      for (const edge of neighbors) {
        if (visited.has(edge.target)) continue;

        const currentDist = distances.get(current.vertex) ?? Number.POSITIVE_INFINITY;
        const newDistance = currentDist + edge.weight;
        const existingDistance = distances.get(edge.target) ?? Number.POSITIVE_INFINITY;

        if (newDistance < existingDistance) {
          distances.set(edge.target, newDistance);
          parents.set(edge.target, current.vertex);
          queue.push({ vertex: edge.target, distance: newDistance });
        }
      }
    }

    // Reconstruct path
    const endDistance = distances.get(end);
    if (endDistance === undefined || endDistance === Number.POSITIVE_INFINITY) {
      return { path: [], distance: Number.POSITIVE_INFINITY, found: false };
    }

    const path: T[] = [];
    let current: T | null | undefined = end;

    while (current !== null && current !== undefined) {
      path.unshift(current);
      current = parents.get(current);
    }

    return { path, distance: endDistance, found: true };
  }

  /**
   * Finds all paths between two vertices (limited by max depth)
   *
   * @param start - Starting vertex
   * @param end - Ending vertex
   * @param maxDepth - Maximum path depth (default: 10)
   * @returns Array of all paths found
   */
  findAllPaths(start: T, end: T, maxDepth = 10): T[][] {
    const paths: T[][] = [];

    if (!this.adjacencyList.has(start) || !this.adjacencyList.has(end)) {
      return paths;
    }

    const findPathsDFS = (current: T, path: T[], visited: Set<T>, depth: number): void => {
      if (depth > maxDepth) return;

      if (current === end) {
        paths.push([...path]);
        return;
      }

      const neighbors = this.getNeighbors(current);
      for (const edge of neighbors) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          path.push(edge.target);
          findPathsDFS(edge.target, path, visited, depth + 1);
          path.pop();
          visited.delete(edge.target);
        }
      }
    };

    const visited = new Set<T>([start]);
    findPathsDFS(start, [start], visited, 0);

    return paths;
  }

  /**
   * Performs topological sort on a directed acyclic graph (DAG)
   *
   * @returns Topologically sorted vertices or null if cycle detected
   *
   * @example
   * ```typescript
   * const sorted = graph.topologicalSort();
   * if (sorted) {
   *   console.log('Processing order:', sorted);
   * }
   * ```
   */
  topologicalSort(): T[] | null {
    if (!this.directed) {
      throw new Error('Topological sort requires a directed graph');
    }

    const inDegree = new Map<T, number>();
    const result: T[] = [];

    // Initialize in-degrees
    for (const vertex of this.adjacencyList.keys()) {
      inDegree.set(vertex, 0);
    }

    // Calculate in-degrees
    for (const vertex of this.adjacencyList.values()) {
      for (const edge of vertex.edges) {
        const currentDegree = inDegree.get(edge.target) ?? 0;
        inDegree.set(edge.target, currentDegree + 1);
      }
    }

    // Find all vertices with in-degree 0
    const queue: T[] = [];
    for (const [vertex, degree] of inDegree) {
      if (degree === 0) {
        queue.push(vertex);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      result.push(current);

      const neighbors = this.getNeighbors(current);
      for (const edge of neighbors) {
        const degree = inDegree.get(edge.target) ?? 0;
        const newDegree = degree - 1;
        inDegree.set(edge.target, newDegree);

        if (newDegree === 0) {
          queue.push(edge.target);
        }
      }
    }

    // Check for cycle
    if (result.length !== this.adjacencyList.size) {
      return null; // Cycle detected
    }

    return result;
  }

  /**
   * Detects if the graph contains a cycle
   *
   * @returns True if a cycle exists
   */
  hasCycle(): boolean {
    if (this.directed) {
      return this.topologicalSort() === null;
    }

    // For undirected graphs, use DFS
    const visited = new Set<T>();

    const hasCycleDFS = (vertex: T, parent: T | null): boolean => {
      visited.add(vertex);

      const neighbors = this.getNeighbors(vertex);
      for (const edge of neighbors) {
        if (!visited.has(edge.target)) {
          if (hasCycleDFS(edge.target, vertex)) {
            return true;
          }
        } else if (edge.target !== parent) {
          return true;
        }
      }

      return false;
    };

    for (const vertex of this.adjacencyList.keys()) {
      if (!visited.has(vertex)) {
        if (hasCycleDFS(vertex, null)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Gets connected components in an undirected graph
   *
   * @returns Array of connected components (each component is an array of vertices)
   */
  getConnectedComponents(): T[][] {
    const visited = new Set<T>();
    const components: T[][] = [];

    for (const vertex of this.adjacencyList.keys()) {
      if (!visited.has(vertex)) {
        const component: T[] = [];
        const queue: T[] = [vertex];

        while (queue.length > 0) {
          const current = queue.shift();
          if (current === undefined || visited.has(current)) continue;

          visited.add(current);
          component.push(current);

          const neighbors = this.getNeighbors(current);
          for (const edge of neighbors) {
            if (!visited.has(edge.target)) {
              queue.push(edge.target);
            }
          }
        }

        components.push(component);
      }
    }

    return components;
  }

  /**
   * Clears all vertices and edges
   */
  clear(): void {
    this.adjacencyList.clear();
  }

  /**
   * Converts graph to adjacency matrix representation
   *
   * @returns Object with vertices array and matrix
   */
  toAdjacencyMatrix(): { vertices: T[]; matrix: number[][] } {
    const vertices = this.getVertices();
    const indexMap = new Map<T, number>();

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      if (v !== undefined) {
        indexMap.set(v, i);
      }
    }

    const matrix: number[][] = Array.from({ length: vertices.length }, () =>
      Array(vertices.length).fill(Number.POSITIVE_INFINITY),
    );

    // Set diagonal to 0
    for (let i = 0; i < vertices.length; i++) {
      const row = matrix[i];
      if (row) {
        row[i] = 0;
      }
    }

    // Fill in edges
    for (const [vertex, data] of this.adjacencyList) {
      const sourceIndex = indexMap.get(vertex);
      if (sourceIndex === undefined) continue;

      for (const edge of data.edges) {
        const targetIndex = indexMap.get(edge.target);
        if (targetIndex !== undefined) {
          const row = matrix[sourceIndex];
          if (row) {
            row[targetIndex] = edge.weight;
          }
        }
      }
    }

    return { vertices, matrix };
  }
}

// ============================================
// Factory Functions for FOIA Stream Use Cases
// ============================================

/**
 * Agency node data
 */
export interface AgencyNode {
  /** Agency ID */
  id: string;
  /** Agency name */
  name: string;
  /** Jurisdiction level */
  jurisdiction: 'federal' | 'state' | 'local';
  /** Parent agency ID */
  parentId?: string;
}

/**
 * Creates a directed graph for agency hierarchy
 *
 * @returns Graph configured for agency relationships
 *
 * @example
 * ```typescript
 * const hierarchy = createAgencyHierarchy();
 *
 * hierarchy.addVertex('doj', { name: 'Department of Justice', jurisdiction: 'federal' });
 * hierarchy.addVertex('fbi', { name: 'Federal Bureau of Investigation', jurisdiction: 'federal' });
 * hierarchy.addEdge('doj', 'fbi', 1, { relationship: 'parent' });
 * ```
 */
export function createAgencyHierarchy(): Graph<string> {
  return new Graph<string>({ directed: true });
}

/**
 * Creates an undirected graph for request forwarding between agencies
 *
 * @returns Graph configured for request routing
 *
 * @example
 * ```typescript
 * const routing = createRequestRoutingGraph();
 *
 * // Agencies that can forward requests to each other
 * routing.addEdge('fbi', 'dea', 2); // Weight represents forwarding cost/time
 * routing.addEdge('dea', 'atf', 1);
 *
 * const path = routing.findShortestPath('fbi', 'atf');
 * ```
 */
export function createRequestRoutingGraph(): Graph<string> {
  return new Graph<string>({ directed: false });
}

/**
 * Builds agency hierarchy from flat list of agencies
 *
 * @param agencies - Array of agency nodes with parent references
 * @returns Populated hierarchy graph
 */
export function buildAgencyHierarchy(agencies: AgencyNode[]): Graph<string> {
  const graph = createAgencyHierarchy();

  // Add all vertices first
  for (const agency of agencies) {
    graph.addVertex(agency.id, {
      name: agency.name,
      jurisdiction: agency.jurisdiction,
    });
  }

  // Add edges based on parent relationships
  for (const agency of agencies) {
    if (agency.parentId && graph.hasVertex(agency.parentId)) {
      graph.addEdge(agency.parentId, agency.id, 1, { relationship: 'parent-child' });
    }
  }

  return graph;
}
