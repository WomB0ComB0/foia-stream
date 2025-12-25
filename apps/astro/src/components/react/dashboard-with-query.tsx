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
 * @file Dashboard wrapper with TanStack Query Provider
 * @module components/react/DashboardWithQuery
 * @author FOIA Stream Team
 */

import DashboardContent from './dashboard-content';
import { QueryProvider } from './query-provider';

/**
 * Dashboard component wrapped with QueryProvider for TanStack Query support.
 * This component should be used as the entry point for the Dashboard page.
 *
 * @component
 * @returns {React.JSX.Element} Dashboard with query provider
 *
 * @example
 * ```tsx
 * <DashboardWithQuery />
 * ```
 */
export default function DashboardWithQuery(): React.JSX.Element {
  return (
    <QueryProvider>
      <DashboardContent />
    </QueryProvider>
  );
}

DashboardWithQuery.displayName = 'DashboardWithQuery';
