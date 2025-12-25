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
 * @file Client-side UI components for loading and error states
 * @module client
 * @author FOIA Stream Team
 */

import type React from 'react';

/**
 * Loading spinner component
 *
 * @component
 * @returns {React.JSX.Element} Animated loading spinner
 *
 * @example
 * ```tsx
 * <Loader />
 * ```
 */
export function Loader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
    </div>
  );
}

Loader.displayName = 'Loader';

/**
 * Props for the ClientError component
 */
export interface ClientErrorProps {
  /** The error that occurred */
  error: Error;
  /** Callback to retry the failed operation */
  retry: () => void;
}

/**
 * Error display component with retry functionality
 *
 * @component
 * @param {ClientErrorProps} props - Component props
 * @returns {React.JSX.Element} Error display with retry button
 * @compliance NIST 800-53 SI-11 (Error Handling)
 *
 * @example
 * ```tsx
 * <ClientError
 *   error={new Error('Failed to load data')}
 *   retry={() => refetch()}
 * />
 * ```
 */
export function ClientError({ error, retry }: ClientErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <title>Error icon</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-surface-100 mb-2">Something went wrong</h3>
      <p className="text-sm text-surface-400 mb-4 max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        type="button"
        onClick={retry}
        className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

ClientError.displayName = 'ClientError';
