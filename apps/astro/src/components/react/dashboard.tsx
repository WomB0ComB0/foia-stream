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
 * @file Dashboard component displaying user's FOIA requests overview
 * @module components/react/Dashboard
 */

import { api, type FoiaRequest } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { initAuth, logout, useAuthStore } from '@/stores/auth';
import { maybeRedact, redactName, usePrivacyStore } from '@/stores/privacy';
import {
  Building2,
  Check,
  ChevronDown,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PrivacyToggleCompact } from './privacy-toggle';

/**
 * Main dashboard component showing request statistics and list
 *
 * @component
 * @returns {React.JSX.Element | null} Dashboard view or null during auth redirect
 *
 * @example
 * ```tsx
 * <Dashboard />
 * ```
 */
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const privacyMode = usePrivacyStore((s) => s.privacyMode);
  const [requests, setRequests] = useState<FoiaRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
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

  /**
   * Fetches user's FOIA requests from the API
   */
  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    const response = await api.getRequests();
    if (response.success && response.data) {
      setRequests(response.data);
    }
    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuth) {
      fetchRequests();
    }
  }, [isAuth, fetchRequests]);

  /**
   * Handles user logout and redirect
   */
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  /**
   * Toggle request selection for bulk actions
   */
  const toggleSelection = (id: string) => {
    setSelectedRequests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Select all requests
   */
  const selectAll = () => {
    if (selectedRequests.size === requests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(requests.map((r) => r.id)));
    }
  };

  /**
   * Clear selection
   */
  const clearSelection = () => {
    setSelectedRequests(new Set());
  };

  /**
   * Handle bulk delete (placeholder)
   */
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedRequests.size} request(s)? This cannot be undone.`)) return;

    setBulkActionLoading(true);
    // In production, this would call an API to delete multiple requests
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate deletion by removing from local state
    setRequests((prev) => prev.filter((r) => !selectedRequests.has(r.id)));
    setSelectedRequests(new Set());
    setBulkActionLoading(false);
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
    <div className="min-h-screen bg-surface-950">
      <header className="sticky top-0 z-50 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-accent-400" />
              <span className="font-display text-lg font-semibold tracking-tight text-surface-100">
                FOIA<span className="text-accent-400">Stream</span>
              </span>
            </a>

            {/* Navigation */}
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium text-accent-400"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </a>
              <a
                href="/agencies"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Agencies
              </a>
              <a
                href="/templates"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Templates
              </a>
              <a
                href="/documents"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Documents
              </a>
            </nav>

            {/* Privacy Toggle + User Menu */}
            <div className="flex items-center gap-2">
              <PrivacyToggleCompact />

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-200 transition-colors hover:border-surface-600 hover:bg-surface-800"
                >
                  <User className="h-4 w-4 text-surface-400" />
                  <span className="hidden sm:inline">{user.firstName}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-surface-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-surface-700 bg-surface-900 p-1.5 shadow-xl shadow-black/20">
                    {/* User Info */}
                    <div className="border-b border-surface-800 px-3 py-2 mb-1.5">
                      <p className="text-sm font-medium text-surface-200">
                        {privacyMode
                          ? redactName(user.firstName, user.lastName)
                          : `${user.firstName} ${user.lastName}`}
                      </p>
                      <p className="text-xs text-surface-500 truncate">
                        {maybeRedact(user.email, privacyMode)}
                      </p>
                    </div>

                    {/* Navigation Links */}
                    <a
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                      <LayoutDashboard className="h-4 w-4 text-surface-500" />
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                      <Settings className="h-4 w-4 text-surface-500" />
                      Settings
                    </a>

                    {/* Divider */}
                    <div className="my-1.5 border-t border-surface-800" />

                    {/* Legal Links */}
                    <a
                      href="/terms"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-300"
                    >
                      <FileText className="h-4 w-4 text-surface-500" />
                      Terms of Service
                    </a>
                    <a
                      href="/privacy"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-300"
                    >
                      <Shield className="h-4 w-4 text-surface-500" />
                      Privacy Policy
                    </a>

                    {/* Divider */}
                    <div className="my-1.5 border-t border-surface-800" />

                    {/* Sign Out */}
                    <button
                      onClick={handleLogout}
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-100">Welcome back, {user.firstName}!</h1>
          <p className="text-surface-400">Manage your FOIA requests and track their progress.</p>
        </div>

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

        <div className="rounded-2xl border border-surface-800 bg-surface-900/50">
          <div className="flex items-center justify-between border-b border-surface-800 px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-surface-100">Your Requests</h2>
              {requests.length > 0 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="flex items-center gap-2 rounded-lg border border-surface-700 px-3 py-1.5 text-xs font-medium text-surface-400 transition-colors hover:border-surface-600 hover:bg-surface-800"
                >
                  {selectedRequests.size === requests.length ? (
                    <>
                      <X className="h-3 w-3" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-3 w-3" />
                      Select All
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedRequests.size > 0 && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-sm text-surface-400">{selectedRequests.size} selected</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {bulkActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                onClick={fetchRequests}
                type="button"
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

          {requestsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-surface-700" />
              <h3 className="mb-2 text-lg font-medium text-surface-100">No requests yet</h3>
              <p className="mb-4 text-surface-400">
                Create your first FOIA request to get started.
              </p>
              <a
                href="/requests/new"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
              >
                <Plus className="h-4 w-4" />
                Create Request
              </a>
            </div>
          ) : (
            <div className="divide-y divide-surface-800">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors hover:bg-surface-800/50 ${
                    selectedRequests.has(request.id) ? 'bg-accent-500/5' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSelection(request.id);
                    }}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      selectedRequests.has(request.id)
                        ? 'border-accent-500 bg-accent-500 text-surface-950'
                        : 'border-surface-600 hover:border-surface-500'
                    }`}
                  >
                    {selectedRequests.has(request.id) && <Check className="h-3 w-3" />}
                  </button>
                  <a href={`/requests/${request.id}`} className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-surface-100">
                          {request.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-surface-400">
                          {request.description}
                        </p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Statistics card component for dashboard metrics
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.icon - Icon element to display
 * @param {string} props.iconBg - Background class for icon container
 * @param {number} props.value - Numeric value to display
 * @param {string} props.label - Label describing the metric
 * @returns {React.JSX.Element} Stat card element
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
