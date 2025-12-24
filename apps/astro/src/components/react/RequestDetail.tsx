/**
 * @file FOIA request detail view component
 * @module components/react/RequestDetail
 */

import { useStore } from '@nanostores/react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Hash,
  Loader2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type FoiaRequest } from '@/lib/api';
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { $isAuthenticated, $isLoading, initAuth } from '@/stores/auth';

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
  const isAuth = useStore($isAuthenticated);
  const authLoading = useStore($isLoading);
  const [request, setRequest] = useState<FoiaRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      fetchRequest();
    }
  }, [isAuth]);

  /**
   * Fetches request data from the API
   */
  const fetchRequest = async () => {
    setLoading(true);
    const response = await api.getRequest(requestId);
    if (response.success && response.data) {
      setRequest(response.data);
    } else {
      setError(true);
    }
    setLoading(false);
  };

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
                  {request.agency.foiaEmail && (
                    <p className="font-display text-sm text-accent-400">{request.agency.foiaEmail}</p>
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
                  <TimelineItem label="Acknowledged" value={formatDateTime(request.acknowledgedAt)} />
                )}
                {request.dueDate && (
                  <TimelineItem label="Due Date" value={formatDate(request.dueDate)} highlight />
                )}
                {request.closedAt && (
                  <TimelineItem label="Closed" value={formatDateTime(request.closedAt)} />
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

              {request.dateRange && (
                <div>
                  <h3 className="mb-1 flex items-center gap-1 text-sm font-medium text-surface-500">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </h3>
                  <p className="text-surface-100">{request.dateRange}</p>
                </div>
              )}

              {request.specificIndividuals && (
                <div>
                  <h3 className="mb-1 flex items-center gap-1 text-sm font-medium text-surface-500">
                    <User className="h-4 w-4" />
                    Specific Individuals
                  </h3>
                  <p className="text-surface-100">{request.specificIndividuals}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Request Options</h2>
            <div className="flex flex-wrap gap-4">
              <OptionBadge
                active={request.expeditedProcessing}
                label={`Expedited Processing: ${request.expeditedProcessing ? 'Yes' : 'No'}`}
                activeColor="bg-accent-500/20 text-accent-300"
              />
              <OptionBadge
                active={request.feeWaiverRequested}
                label={`Fee Waiver: ${request.feeWaiverRequested ? 'Requested' : 'Not Requested'}`}
                activeColor="bg-emerald-500/20 text-emerald-300"
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
      <span className={highlight ? 'font-medium text-accent-400' : 'text-surface-100'}>{value}</span>
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
