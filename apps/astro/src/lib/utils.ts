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
 * @file Utility functions and constants for the FOIA Stream frontend
 * @module utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with proper precedence handling
 * @param {...ClassValue[]} inputs - Class values to merge
 * @returns {string} Merged class string
 * @example
 * cn('px-4 py-2', 'px-6') // Returns 'py-2 px-6'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a short localized format
 * @param {string | null | undefined} dateString - ISO date string to format
 * @returns {string} Formatted date or em dash if null/undefined
 * @example
 * formatDate('2024-01-15T10:30:00Z') // Returns 'Jan 15, 2024'
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date string to include time
 * @param {string | null | undefined} dateString - ISO date string to format
 * @returns {string} Formatted date and time or em dash if null/undefined
 * @example
 * formatDateTime('2024-01-15T10:30:00Z') // Returns 'Jan 15, 2024, 10:30 AM'
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns Tailwind CSS classes for a request status badge
 * @param {string} status - Request status value
 * @returns {string} Tailwind CSS class string for the status
 * @example
 * getStatusColor('completed') // Returns 'bg-emerald-600 text-white'
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-surface-500 text-surface-100',
    submitted: 'bg-blue-600 text-white',
    pending: 'bg-amber-500 text-black',
    processing: 'bg-purple-600 text-white',
    completed: 'bg-emerald-600 text-white',
    rejected: 'bg-red-600 text-white',
    appealed: 'bg-orange-500 text-white',
  };
  return colors[status] ?? 'bg-surface-600 text-surface-100';
}

/**
 * Available FOIA request categories
 * @constant
 * @type {ReadonlyArray<{value: string, label: string}>}
 */
export const CATEGORIES = [
  { value: 'general', label: 'General Records' },
  { value: 'contracts', label: 'Contracts & Procurement' },
  { value: 'personnel', label: 'Personnel Records' },
  { value: 'financial', label: 'Financial Records' },
  { value: 'communications', label: 'Communications & Correspondence' },
  { value: 'policy', label: 'Policies & Procedures' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'environmental', label: 'Environmental Records' },
  { value: 'other', label: 'Other' },
] as const;
