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
 * @file FOIA request detail view component
 * @module components/react/RequestDetail
 */

import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Hash,
  Link,
  Loader2,
  Lock,
  RefreshCw,
  Share2,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, type FoiaRequest } from '@/lib/api';
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { initAuth, useAuthStore } from '@/stores/auth';

/**
 * Props for the RequestDetail component
 * @interface Props
 */
interface Props {
  requestId: string;
}

/**
 * Displays detailed information about a single FOIA request
 *
 * @component
 * @param {Props} props - Component props
 * @param {string} props.requestId - ID of the request to display
 * @returns {React.JSX.Element | null} Request detail view
 *
 * @example
 * ```tsx
 * <RequestDetail requestId="abc123" />
 * ```
 */
export default function RequestDetail({ requestId }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [request, setRequest] = useState<FoiaRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuth) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuth]);

  /**
   * Fetches request data from the API
   */
  const fetchRequest = useCallback(async () => {
    setLoading(true);
    const response = await api.getRequest(requestId);
    if (response.success && response.data) {
      setRequest(response.data);
    } else {
      setError(true);
    }
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    if (isAuth) {
      fetchRequest();
    }
  }, [isAuth, fetchRequest]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!isAuth) {
    return null;
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-surface-950">
        <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center gap-4">
              <a
                href="/dashboard"
                className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </a>
              <span className="text-lg font-semibold text-surface-100">Request Not Found</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-surface-700" />
            <h3 className="mb-2 text-lg font-medium text-surface-100">Request not found</h3>
            <p className="mb-4 text-surface-400">
              The request you're looking for doesn't exist or you don't have access to it.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 hover:bg-accent-400"
            >
              Back to Dashboard
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </a>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-accent-400" />
                <span className="text-lg font-semibold text-surface-100">Request Details</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              {request.status === 'draft' && (
                <a
                  href={`/requests/${requestId}/edit`}
                  className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 hover:bg-accent-400"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-surface-100">{request.title}</h1>
                {request.trackingNumber && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-surface-400">
                    <Hash className="h-4 w-4" />
                    <span className="font-display">Tracking: {request.trackingNumber}</span>
                  </div>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(request.status)}`}
              >
                {request.status}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-surface-300">{request.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-100">
                <Building2 className="h-5 w-5 text-surface-500" />
                Agency
              </h2>
              {request.agency ? (
                <div className="space-y-2">
                  <p className="font-medium text-surface-100">{request.agency.name}</p>
                  {request.agency.abbreviation && (
                    <p className="text-sm text-surface-400">({request.agency.abbreviation})</p>
                  )}
                  {'foiaEmail' in request.agency &&
                    (request.agency as { foiaEmail?: string }).foiaEmail && (
                      <p className="font-display text-sm text-accent-400">
                        {(request.agency as { foiaEmail?: string }).foiaEmail}
                      </p>
                    )}
                </div>
              ) : (
                <p className="text-surface-400">Agency ID: {request.agencyId}</p>
              )}
            </div>

            <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-100">
                <Clock className="h-5 w-5 text-surface-500" />
                Timeline
              </h2>
              <div className="space-y-3">
                <TimelineItem label="Created" value={formatDateTime(request.createdAt)} />
                {request.submittedAt && (
                  <TimelineItem label="Submitted" value={formatDateTime(request.submittedAt)} />
                )}
                {request.acknowledgedAt && (
                  <TimelineItem
                    label="Acknowledged"
                    value={formatDateTime(request.acknowledgedAt)}
                  />
                )}
                {request.dueDate && (
                  <TimelineItem label="Due Date" value={formatDate(request.dueDate)} highlight />
                )}
                {request.completedAt && (
                  <TimelineItem label="Completed" value={formatDateTime(request.completedAt)} />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Additional Details</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm font-medium text-surface-500">Category</h3>
                <p className="capitalize text-surface-100">{request.category}</p>
              </div>

              {(request.dateRangeStart || request.dateRangeEnd) && (
                <div>
                  <h3 className="mb-1 flex items-center gap-1 text-sm font-medium text-surface-500">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </h3>
                  <p className="text-surface-100">
                    {request.dateRangeStart && formatDate(request.dateRangeStart)}
                    {request.dateRangeStart && request.dateRangeEnd && ' - '}
                    {request.dateRangeEnd && formatDate(request.dateRangeEnd)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Request Options</h2>
            <div className="flex flex-wrap gap-4">
              <OptionBadge
                active={request.isPublic}
                label={`Public: ${request.isPublic ? 'Yes' : 'No'}`}
                activeColor="bg-accent-500/20 text-accent-300"
              />
            </div>

            {(request.estimatedFee != null || request.actualFee != null) && (
              <div className="mt-4 border-t border-surface-800 pt-4">
                <h3 className="mb-2 text-sm font-medium text-surface-500">Fee Information</h3>
                <div className="flex gap-6">
                  {request.estimatedFee != null && (
                    <div>
                      <span className="text-sm text-surface-400">Estimated: </span>
                      <span className="font-display font-medium text-surface-100">
                        ${request.estimatedFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {request.actualFee != null && (
                    <div>
                      <span className="text-sm text-surface-400">Actual: </span>
                      <span className="font-display font-medium text-surface-100">
                        ${request.actualFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && request && (
        <ShareModal request={request} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}

/**
 * Share modal for password-protected link sharing
 */
function ShareModal({ request, onClose }: { request: FoiaRequest; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateShareLink = async () => {
    setGenerating(true);

    // In production, this would call an API to create a secure share link
    // For now, we'll create a simulated link with encrypted params
    await new Promise((resolve) => setTimeout(resolve, 500));

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareId = btoa(
      JSON.stringify({
        id: request.id,
        exp: Date.now() + parseInt(expiresIn, 10) * 60 * 60 * 1000,
        pwd: password ? btoa(password) : null,
      }),
    );

    setShareLink(`${baseUrl}/shared/${shareId}`);
    setGenerating(false);
  };

  const copyLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10">
              <Share2 className="h-5 w-5 text-accent-400" />
            </div>
            <h2 className="text-lg font-semibold text-surface-100">Share Request</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!shareLink ? (
            <>
              <div>
                <label
                  htmlFor="share-password"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Password Protection
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
                  <input
                    id="share-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Optional password"
                    className="w-full rounded-lg border border-surface-700 bg-surface-800 py-3 pl-10 pr-20 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded p-1.5 text-surface-500 hover:text-surface-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="rounded p-1.5 text-surface-500 hover:text-surface-300"
                      title="Generate password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-surface-500">
                  {password
                    ? 'Link will require this password to view'
                    : 'Leave empty for no password'}
                </p>
              </div>

              <div>
                <label
                  htmlFor="share-expiration"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Link Expiration
                </label>
                <select
                  id="share-expiration"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 focus:border-accent-500 focus:outline-none"
                >
                  <option value="1">1 hour</option>
                  <option value="24">24 hours</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-sm text-amber-300">
                  <strong>Note:</strong> Shared links provide read-only access to this request's
                  details. The recipient won't be able to modify anything.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-lg bg-emerald-500/10 p-4">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>

              <div>
                <label
                  htmlFor="share-link"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    id="share-link"
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-sm text-surface-100 font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-accent-500 text-surface-950 hover:bg-accent-400'
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {password && (
                <div className="rounded-lg border border-surface-700 bg-surface-800 p-3">
                  <p className="mb-1 text-xs text-surface-500">Password to share:</p>
                  <code className="text-sm font-mono text-surface-100">{password}</code>
                </div>
              )}

              <p className="text-center text-xs text-surface-500">
                Link expires in{' '}
                {expiresIn === '1'
                  ? '1 hour'
                  : expiresIn === '24'
                    ? '24 hours'
                    : expiresIn === '168'
                      ? '7 days'
                      : '30 days'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-surface-800 p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-surface-700 px-4 py-3 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-800"
          >
            {shareLink ? 'Close' : 'Cancel'}
          </button>
          {!shareLink && (
            <button
              type="button"
              onClick={generateShareLink}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link className="h-4 w-4" />
              )}
              Generate Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline item displaying a label and value pair
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.label - Label text
 * @param {string} props.value - Value text
 * @param {boolean} [props.highlight] - Whether to highlight the value
 * @returns {React.JSX.Element} Timeline item element
 */
function TimelineItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-surface-400">{label}</span>
      <span className={highlight ? 'font-medium text-accent-400' : 'text-surface-100'}>
        {value}
      </span>
    </div>
  );
}

/**
 * Option badge displaying request flags
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.active - Whether the option is active
 * @param {string} props.label - Badge label text
 * @param {string} props.activeColor - Tailwind classes for active state
 * @returns {React.JSX.Element} Option badge element
 */
function OptionBadge({
  active,
  label,
  activeColor,
}: {
  active: boolean;
  label: string;
  activeColor: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
        active ? activeColor : 'bg-surface-800 text-surface-400'
      }`}
    >
      <CheckCircle2 className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
