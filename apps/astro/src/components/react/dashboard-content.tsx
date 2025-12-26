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
 * @file Dashboard content component using TanStack Query
 * @module components/react/DashboardContent
 * @author FOIA Stream Team
 */

import type { FoiaRequest } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { formatDate, getStatusColor } from '@/lib/utils';
import { initAuth, logout, useAuthStore } from '@/stores/auth';
import {
  Building2,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  User,
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useDataLoader } from './effect-data-loader';

interface RequestsResponse {
  data: FoiaRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Requests list component using useDataLoader hook
 */
function RequestsList({ onRefetch }: { onRefetch?: (refetch: () => Promise<void>) => void }) {
  const { data, refetch } = useDataLoader<RequestsResponse>(`${API_BASE}/requests`, {
    staleTime: 1_000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const requests = data?.data || [];

  useEffect(() => {
    if (onRefetch) {
      onRefetch(refetch);
    }
  }, [onRefetch, refetch]);

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-surface-700" />
        <h3 className="mb-2 text-lg font-medium text-surface-100">No requests yet</h3>
        <p className="mb-4 text-surface-400">Create your first FOIA request to get started.</p>
        <a
          href="/requests/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
        >
          <Plus className="h-4 w-4" />
          Create Request
        </a>
      </div>
    );
  }

  return (
    <div className="divide-y divide-surface-800">
      {requests.map((request) => (
        <a
          key={request.id}
          href={`/requests/${request.id}`}
          className="block px-6 py-4 transition-colors hover:bg-surface-800/50"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-surface-100">{request.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-surface-400">{request.description}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-surface-500">
                <span>Created {formatDate(request.createdAt)}</span>
                {request.trackingNumber && (
                  <span className="font-display">#{request.trackingNumber}</span>
                )}
              </div>
            </div>
            <span
              className={`ml-4 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(request.status)}`}
            >
              {request.status}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

/**
 * Dashboard stats component using useDataLoader hook
 */
function DashboardStats() {
  const { data } = useDataLoader<RequestsResponse>(`${API_BASE}/requests`, {
    staleTime: 1_000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const requests = data?.data || [];

  const pendingCount = requests.filter(
    (r) => r.status === 'submitted' || r.status === 'processing' || r.status === 'acknowledged',
  ).length;
  const completedCount = requests.filter((r) =>
    [
      'fulfilled',
      'partially_fulfilled',
      'denied',
      'appeal_granted',
      'appeal_denied',
      'withdrawn',
    ].includes(r.status),
  ).length;
  const uniqueAgencies = new Set(requests.map((r) => r.agencyId)).size;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        icon={<FileText className="h-5 w-5 text-accent-400" />}
        iconBg="bg-accent-500/10"
        value={requests.length}
        label="Total Requests"
      />
      <StatCard
        icon={<Clock className="h-5 w-5 text-amber-400" />}
        iconBg="bg-amber-500/10"
        value={pendingCount}
        label="In Progress"
      />
      <StatCard
        icon={<FileText className="h-5 w-5 text-emerald-400" />}
        iconBg="bg-emerald-500/10"
        value={completedCount}
        label="Completed"
      />
      <StatCard
        icon={<Building2 className="h-5 w-5 text-purple-400" />}
        iconBg="bg-purple-500/10"
        value={uniqueAgencies}
        label="Agencies"
      />
    </div>
  );
}

/**
 * Statistics card component
 */
function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900/50 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
        <div>
          <p className="font-display text-2xl font-bold text-surface-100">{value}</p>
          <p className="text-sm text-surface-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main dashboard content component
 */
export default function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [refetchFn, setRefetchFn] = useState<(() => Promise<void>) | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuth) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuth]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!isAuth || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-accent-400" />
              <span className="font-display text-lg font-semibold tracking-tight text-surface-100">
                FOIA<span className="text-accent-400">Stream</span>
              </span>
            </a>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
              >
                <User className="h-4 w-4" />
                <span>{user.email}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-surface-800 bg-surface-900 shadow-xl">
                  <div className="border-b border-surface-800 px-4 py-3">
                    <p className="text-sm font-medium text-surface-100">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-surface-500">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <a
                      href="/settings"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </a>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-100">Welcome back, {user.firstName}!</h1>
          <p className="text-surface-400">Manage your FOIA requests and track their progress.</p>
        </div>

        <Suspense
          fallback={
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
              {['stat-1', 'stat-2', 'stat-3', 'stat-4'].map((id) => (
                <div
                  key={id}
                  className="animate-pulse rounded-xl border border-surface-800 bg-surface-900/50 p-4 h-20"
                />
              ))}
            </div>
          }
        >
          <DashboardStats />
        </Suspense>

        <div className="rounded-2xl border border-surface-800 bg-surface-900/50">
          <div className="flex items-center justify-between border-b border-surface-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-surface-100">Your Requests</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchFn?.()}
                className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <a
                href="/requests/new"
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
              >
                <Plus className="h-4 w-4" />
                New Request
              </a>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
              </div>
            }
          >
            <RequestsList onRefetch={setRefetchFn} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

DashboardContent.displayName = 'DashboardContent';
