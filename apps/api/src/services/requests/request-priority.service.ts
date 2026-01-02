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
 * @file Request Prioritization Service
 * @module services/request-priority
 * @author FOIA Stream Team
 * @description O(log n) request prioritization using binary heap.
 *              Manages FOIA request queues by deadline, urgency, or custom criteria.
 * @compliance NIST 800-53 AU-6 (Audit Review, Analysis, and Reporting)
 */

import { createDeadlineQueue, PriorityQueue, type PriorityQueueStats } from '@foia-stream/shared';
import { eq } from 'drizzle-orm';
import { Schema as S } from 'effect';

import { db, schema } from '@/db';

// ============================================
// Types
// ============================================

/**
 * Extended priority item with full request data
 * @schema
 */
export const PrioritizedRequestSchema = S.mutable(
  S.Struct({
    /** Request ID */
    id: S.String,
    /** Request deadline */
    deadline: S.DateFromSelf,
    /** Priority level (1-5, lower = higher) */
    priority: S.Number,
    /** Request status */
    status: S.String,
    /** User who submitted the request */
    userId: S.String,
    /** Target agency ID */
    agencyId: S.String,
    /** Request subject/title */
    subject: S.String,
    /** Created timestamp */
    createdAt: S.DateFromSelf,
    /** Days until deadline */
    daysUntilDeadline: S.Number,
    /** Whether the request is overdue */
    isOverdue: S.Boolean,
  }),
);
export type PrioritizedRequest = typeof PrioritizedRequestSchema.Type;

/**
 * Priority queue type
 */
export type QueueType = 'deadline' | 'priority' | 'custom';

/**
 * Queue configuration schema
 * @schema
 */
export const QueueConfigSchema = S.Struct({
  /** Maximum items in queue */
  maxSize: S.optional(S.Number),
  /** Auto-refresh interval in milliseconds */
  refreshInterval: S.optional(S.Number),
});
export type QueueConfig = typeof QueueConfigSchema.Type;

// ============================================
// Request Priority Service
// ============================================

/**
 * Request Priority Service using Binary Heap
 *
 * Provides O(log n) insertion and retrieval of highest-priority requests.
 * Supports multiple queue strategies: deadline-based, priority-level, or custom.
 *
 * Time Complexity:
 * - enqueue: O(log n)
 * - getNext: O(log n)
 * - peek: O(1)
 *
 * @example
 * ```typescript
 * const priorityService = RequestPriorityService.getInstance();
 *
 * // Initialize deadline-based queue
 * await priorityService.initialize('deadline');
 *
 * // Get most urgent request
 * const urgent = priorityService.getNextRequest();
 * ```
 */
export class RequestPriorityService {
  private static instance: RequestPriorityService | null = null;

  /** Main priority queue */
  private queue: PriorityQueue<PrioritizedRequest>;

  /** Queue type */
  private queueType: QueueType;

  /** Whether initialized */
  private initialized = false;

  /** Configuration */
  private config: QueueConfig;

  /** Refresh timer */
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Private constructor for singleton
   */
  private constructor() {
    this.queue = this.createQueue('deadline');
    this.queueType = 'deadline';
    this.config = {
      maxSize: 1000,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Gets singleton instance
   */
  static getInstance(): RequestPriorityService {
    if (!RequestPriorityService.instance) {
      RequestPriorityService.instance = new RequestPriorityService();
    }
    return RequestPriorityService.instance;
  }

  /**
   * Initializes the priority queue from database
   *
   * @param type - Queue type (deadline, priority, or custom)
   * @param config - Optional configuration
   */
  async initialize(type: QueueType = 'deadline', config?: QueueConfig): Promise<void> {
    this.queueType = type;
    this.queue = this.createQueue(type);

    if (config) {
      this.config = { ...this.config, ...config };
    }

    await this.loadPendingRequests();
    this.initialized = true;

    // Setup auto-refresh
    if (this.config.refreshInterval) {
      this.startAutoRefresh();
    }
  }

  /**
   * Gets the next highest-priority request without removing it
   *
   * @returns Highest priority request or undefined
   */
  peekNextRequest(): PrioritizedRequest | undefined {
    this.ensureInitialized();
    return this.queue.peek();
  }

  /**
   * Gets and removes the next highest-priority request
   *
   * @returns Highest priority request or undefined
   */
  getNextRequest(): PrioritizedRequest | undefined {
    return this.queue.dequeue();
  }

  /**
   * Gets multiple highest-priority requests
   *
   * @param count - Number of requests to get
   * @returns Array of prioritized requests
   */
  getTopRequests(count: number): PrioritizedRequest[] {
    const results: PrioritizedRequest[] = [];
    const temp: PrioritizedRequest[] = [];

    // Extract top N
    for (let i = 0; i < count && !this.queue.isEmpty; i++) {
      const item = this.queue.dequeue();
      if (item) {
        results.push(item);
        temp.push(item);
      }
    }

    // Re-add to queue
    for (const item of temp) {
      this.queue.enqueue(item);
    }

    return results;
  }

  /**
   * Adds a request to the priority queue
   *
   * @param requestId - Request ID
   * @returns The prioritized request or null if not found
   */
  async addRequest(requestId: string): Promise<PrioritizedRequest | null> {
    const requests = await db
      .select()
      .from(schema.foiaRequests)
      .where(eq(schema.foiaRequests.id, requestId));
    const request = requests[0];

    if (!request) {
      return null;
    }

    const prioritized = this.toPrioritizedRequest(request);
    this.queue.enqueue(prioritized);

    return prioritized;
  }

  /**
   * Updates a request's priority
   *
   * @param requestId - Request ID to update
   * @param newPriority - New priority level (1-5, lower = higher priority)
   */
  async updatePriority(requestId: string, newPriority: number): Promise<boolean> {
    // Find and remove old entry
    const existing = this.findRequest(requestId);
    if (!existing) {
      return false;
    }

    this.queue.remove(existing, (a, b) => a.id === b.id);

    // Re-add with updated priority
    existing.priority = newPriority;
    this.queue.enqueue(existing);

    return true;
  }

  /**
   * Removes a request from the queue
   *
   * @param requestId - Request ID to remove
   * @returns True if removed
   */
  removeRequest(requestId: string): boolean {
    const existing = this.findRequest(requestId);
    if (!existing) {
      return false;
    }

    return this.queue.remove(existing, (a, b) => a.id === b.id);
  }

  /**
   * Gets all overdue requests
   *
   * @returns Array of overdue requests, sorted by how overdue they are
   */
  getOverdueRequests(): PrioritizedRequest[] {
    return this.queue
      .toArray()
      .filter((r) => r.isOverdue)
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  /**
   * Gets requests due within a specified number of days
   *
   * @param days - Number of days to look ahead
   * @returns Array of requests due within the period
   */
  getRequestsDueWithin(days: number): PrioritizedRequest[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return this.queue
      .toArray()
      .filter((r) => r.deadline <= cutoff)
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  /**
   * Gets queue statistics
   */
  getStats(): PriorityQueueStats & {
    overdueCount: number;
    urgentCount: number;
    queueType: QueueType;
  } {
    const baseStats = this.queue.getStats();
    const overdueCount = this.queue.toArray().filter((r) => r.isOverdue).length;
    const urgentCount = this.queue.toArray().filter((r) => r.daysUntilDeadline <= 7).length;

    return {
      ...baseStats,
      overdueCount,
      urgentCount,
      queueType: this.queueType,
    };
  }

  /**
   * Refreshes the queue from database
   */
  async refresh(): Promise<void> {
    this.queue.clear();
    await this.loadPendingRequests();
  }

  /**
   * Stops auto-refresh and clears the queue
   */
  shutdown(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.queue.clear();
    this.initialized = false;
  }

  /**
   * Resets singleton instance (for testing)
   */
  static resetInstance(): void {
    if (RequestPriorityService.instance) {
      RequestPriorityService.instance.shutdown();
    }
    RequestPriorityService.instance = null;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Creates a priority queue based on type
   */
  private createQueue(type: QueueType): PriorityQueue<PrioritizedRequest> {
    switch (type) {
      case 'deadline':
        return new PriorityQueue<PrioritizedRequest>({
          compareFn: (a, b) => {
            // Overdue items first
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            // Then by deadline
            return a.deadline.getTime() - b.deadline.getTime();
          },
        });

      case 'priority':
        return new PriorityQueue<PrioritizedRequest>({
          compareFn: (a, b) => {
            // Lower priority number = higher priority
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            // Tie-break by deadline
            return a.deadline.getTime() - b.deadline.getTime();
          },
        });

      case 'custom':
        return new PriorityQueue<PrioritizedRequest>({
          compareFn: (a, b) => {
            // Custom scoring: combine priority and deadline urgency
            const scoreA = a.priority * 10 + Math.max(0, 30 - a.daysUntilDeadline);
            const scoreB = b.priority * 10 + Math.max(0, 30 - b.daysUntilDeadline);
            return scoreA - scoreB;
          },
        });

      default:
        return createDeadlineQueue() as unknown as PriorityQueue<PrioritizedRequest>;
    }
  }

  /**
   * Loads pending requests from database
   */
  private async loadPendingRequests(): Promise<void> {
    const requests = await db
      .select()
      .from(schema.foiaRequests)
      .limit(this.config.maxSize ?? 1000);

    for (const request of requests) {
      // Only queue non-terminal statuses
      if (!['fulfilled', 'denied', 'appeal_denied', 'withdrawn'].includes(request.status)) {
        const prioritized = this.toPrioritizedRequest(request);
        this.queue.enqueue(prioritized);
      }
    }
  }

  /**
   * Converts database request to prioritized request
   */
  private toPrioritizedRequest(
    request: typeof schema.foiaRequests.$inferSelect,
  ): PrioritizedRequest {
    const now = new Date();
    const deadline = request.dueDate
      ? new Date(request.dueDate)
      : new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // Default 20 days

    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    return {
      id: request.id,
      deadline,
      priority: this.calculatePriority(request),
      status: request.status,
      userId: request.userId,
      agencyId: request.agencyId,
      subject: request.title,
      createdAt: new Date(request.createdAt),
      daysUntilDeadline,
      isOverdue: daysUntilDeadline < 0,
    };
  }

  /**
   * Calculates priority level from request data
   */
  private calculatePriority(request: typeof schema.foiaRequests.$inferSelect): number {
    // Base priority
    let priority = 3;

    // Expedited requests get higher priority
    if ((request as unknown as { isExpedited?: boolean }).isExpedited) {
      priority = 1;
    }

    // Adjust based on status
    if (request.status === 'appeal_pending') {
      priority = Math.min(priority, 2);
    }

    return priority;
  }

  /**
   * Finds a request by ID in the queue
   */
  private findRequest(requestId: string): PrioritizedRequest | undefined {
    return this.queue.toArray().find((r) => r.id === requestId);
  }

  /**
   * Starts auto-refresh timer
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      await this.refresh();
    }, this.config.refreshInterval);
  }

  /**
   * Ensures the queue is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RequestPriorityService not initialized. Call initialize() first.');
    }
  }
}

// Export singleton instance
export const requestPriorityService = RequestPriorityService.getInstance();
