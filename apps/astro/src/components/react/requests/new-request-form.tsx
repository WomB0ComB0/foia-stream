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
 * @file New FOIA request creation form component
 * @module components/react/NewRequestForm
 */

import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type Agency, api, type Template } from '@/lib/api';
import { CATEGORIES } from '@/lib/utils';
import { initAuth, useAuthStore } from '@/stores/auth';
import AgencySearch from '../agencies/agency-search';

/**
 * Form component for creating new FOIA requests
 *
 * @component
 * @returns {React.JSX.Element | null} Request creation form or null during auth redirect
 *
 * @example
 * ```tsx
 * <NewRequestForm />
 * ```
 */
export default function NewRequestForm() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    dateRangeStart: '',
    dateRangeEnd: '',
    isPublic: false,
  });

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuth) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuth]);

  /**
   * Fetches agencies and templates data
   */
  const fetchData = useCallback(async () => {
    setAgenciesLoading(true);
    const [agenciesRes, templatesRes] = await Promise.all([
      api.getAgencies({ limit: 1000 }),
      api.getTemplates(),
    ]);
    if (agenciesRes.success && agenciesRes.data) {
      setAgencies(agenciesRes.data);
    }
    if (templatesRes.success && templatesRes.data) {
      setTemplates(templatesRes.data);
    }
    setAgenciesLoading(false);
  }, []);

  useEffect(() => {
    if (isAuth) {
      fetchData();
    }
  }, [isAuth, fetchData]);

  /**
   * Handles input field changes
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} e - Change event
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /**
   * Handles template selection and populates description
   * @param {string} templateId - Selected template ID
   */
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        description: template.templateText || prev.description,
      }));
    }
  };

  /**
   * Handles form submission
   * @param {React.FormEvent} e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedAgency) {
      setError('Please select an agency');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a request title');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a request description');
      return;
    }

    setIsSubmitting(true);

    const response = await api.createRequest({
      agencyId: selectedAgency.id,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      dateRangeStart: formData.dateRangeStart || undefined,
      dateRangeEnd: formData.dateRangeEnd || undefined,
      isPublic: formData.isPublic,
    });

    if (response.success) {
      window.location.href = '/dashboard';
    } else {
      setError(response.error || 'Failed to create request');
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!isAuth) {
    return null;
  }

  const inputClass =
    'block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <a
              href="/dashboard"
              className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-accent-400" />
              <span className="text-lg font-semibold text-surface-100">New FOIA Request</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Select Agency</h2>

            <div>
              <span className="mb-2 block text-sm font-medium text-surface-300">
                Search for an agency
              </span>
              <AgencySearch
                agencies={agencies}
                selectedAgency={selectedAgency}
                onSelect={setSelectedAgency}
                loading={agenciesLoading}
                placeholder="Type to search... (e.g., FBI, *police*, CA sheriff)"
              />
              <p className="mt-2 text-xs text-surface-500">
                Search {agencies.length} agencies by name, abbreviation, or location. Use{' '}
                <code className="rounded bg-surface-800 px-1">*</code> as wildcard.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Request Details</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium text-surface-300">
                  Request Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief title describing your request"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {templates.length > 0 && (
                <div>
                  <label
                    htmlFor="template"
                    className="mb-2 block text-sm font-medium text-surface-300"
                  >
                    Use Template <span className="text-surface-500">(optional)</span>
                  </label>
                  <select
                    id="template"
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">No template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Request Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe in detail the records you are requesting..."
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="dateRangeStart"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Date Range Start <span className="text-surface-500">(optional)</span>
                </label>
                <input
                  type="date"
                  id="dateRangeStart"
                  name="dateRangeStart"
                  value={formData.dateRangeStart}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="dateRangeEnd"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Date Range End <span className="text-surface-500">(optional)</span>
                </label>
                <input
                  type="date"
                  id="dateRangeEnd"
                  name="dateRangeEnd"
                  value={formData.dateRangeEnd}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Request Options</h2>

            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
                />
                <div>
                  <span className="text-sm font-medium text-surface-100">Make Request Public</span>
                  <p className="text-sm text-surface-400">
                    Allow others to view this request and its responses.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <a
              href="/dashboard"
              className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
