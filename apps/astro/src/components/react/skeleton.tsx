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
 * @file Skeleton loading components for better UX
 * @module components/react/Skeleton
 */

import type React from 'react';

/**
 * Base skeleton component
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-800 ${className}`} />;
}

/**
 * Skeleton for text content
 */
export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton placeholders don't reorder
        <Skeleton key={i} className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton for cards
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-surface-800 bg-surface-900/50 p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton for request list items
 */
export function SkeletonRequestItem({ className = '' }: { className?: string }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-5 w-2/3 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for stat cards
 */
export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-surface-800 bg-surface-900/50 p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for agency cards
 */
export function SkeletonAgencyCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-surface-800 bg-surface-900/50 p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Skeleton for template cards
 */
export function SkeletonTemplateCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-surface-800 bg-surface-900/50 p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-5 w-2/3 mb-2" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards
 */
export function SkeletonGrid({
  count = 6,
  Card = SkeletonCard,
  className = '',
}: {
  count?: number;
  Card?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton grid doesn't reorder
        <Card key={i} />
      ))}
    </div>
  );
}
