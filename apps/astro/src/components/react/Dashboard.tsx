/**
 * @file Dashboard component displaying user's FOIA requests overview
 * @module components/react/Dashboard
 */

import { useStore } from '@nanostores/react';
import { Building2, Clock, FileText, Loader2, LogOut, Plus, RefreshCw, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type FoiaRequest } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { $user, $isAuthenticated, $isLoading, logout, initAuth } from '@/stores/auth';

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
  const user = useStore($user);
  const isAuth = useStore($isAuthenticated);
  const authLoading = useStore($isLoading);
  const [requests, setRequests] = useState<FoiaRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuth) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuth]);

  useEffect(() => {
    if (isAuth) {
      fetchRequests();
    }
  }, [isAuth]);

  /**
   * Fetches user's FOIA requests from the API
   */
  const fetchRequests = async () => {
    setRequestsLoading(true);
    const response = await api.getRequests();
    if (response.success && response.data) {
      setRequests(response.data);
    }
    setRequestsLoading(false);
  };

  /**
   * Handles user logout and redirect
   */
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

  const pendingCount = requests.filter((r) => r.status === 'pending' || r.status === 'processing').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const uniqueAgencies = new Set(requests.map((r) => r.agencyId)).size;

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

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-surface-400">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-100">
            Welcome back, {user.firstName}!
          </h1>
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
            <h2 className="text-lg font-semibold text-surface-100">Your Requests</h2>
            <div className="flex items-center gap-2">
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
              <p className="mb-4 text-surface-400">Create your first FOIA request to get started.</p>
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
                <a
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block px-6 py-4 transition-colors hover:bg-surface-800/50"
                >
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
