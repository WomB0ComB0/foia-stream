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
 * @description Uses TanStack Form for form state management and Zod for validation
 */

import { useForm } from '@tanstack/react-form';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { type Agency, api, type Template } from '@/lib/api';
import { getFieldError, getInputClass, labelClass, newRequestSchema } from '@/lib/form-utils';
import { CATEGORIES } from '@/lib/utils';
import { initAuth, useAuthStore } from '@/stores/auth';
import MultiAgencySelector from '../agencies/multi-agency-selector';

/**
 * Form component for creating new FOIA requests
 * Uses TanStack Form for state management and Zod for validation
 *
 * @component
 * @returns {React.JSX.Element | null} Request creation form or null during auth redirect
 */
export default function NewRequestForm() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedAgencies, setSelectedAgencies] = useState<Agency[]>([]);
  const [submitProgress, setSubmitProgress] = useState('');

  // TanStack Form with Zod validation
  const form = useForm({
    defaultValues: {
      agencyId: '',
      title: '',
      description: '',
      category: 'other',
      dateRangeStart: '',
      dateRangeEnd: '',
      templateId: '',
      isPublic: false,
    },
    validators: {
      onChange: newRequestSchema,
    },
    onSubmit: async ({ value }) => {
      setError('');

      // Validate at least one agency is selected
      if (selectedAgencies.length === 0) {
        setError('Please select at least one agency');
        return;
      }

      // Use bulk API if multiple agencies, single API for one agency
      if (selectedAgencies.length === 1) {
        setSubmitProgress('Creating request...');
        const response = await api.createRequest({
          agencyId: selectedAgencies[0].id,
          title: value.title,
          description: value.description,
          category: value.category,
          dateRangeStart: value.dateRangeStart || undefined,
          dateRangeEnd: value.dateRangeEnd || undefined,
          isPublic: value.isPublic,
        });

        if (response.success) {
          window.location.href = '/dashboard';
        } else {
          setError(response.error || 'Failed to create request');
          setSubmitProgress('');
        }
      } else {
        setSubmitProgress(`Creating ${selectedAgencies.length} requests...`);
        const responses = await Promise.all(
          selectedAgencies.map((agency) =>
            api.createRequest({
              agencyId: agency.id,
              title: value.title,
              description: value.description,
              category: value.category,
              dateRangeStart: value.dateRangeStart || undefined,
              dateRangeEnd: value.dateRangeEnd || undefined,
              isPublic: value.isPublic,
            })
          )
        );

        const failed = responses.filter((r) => !r.success);
        if (failed.length === 0) {
          window.location.href = '/dashboard';
        } else {
          setError(
            failed[0].error ||
              `Failed to create ${failed.length} of ${selectedAgencies.length} requests`
          );
          setSubmitProgress('');
        }
      }
    },
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
      api.getAgencies({ pageSize: 100 }),
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
   * Handles agency selection changes from the multi-select component
   */
  const handleAgencySelectionChange = (agencies: Agency[]) => {
    setSelectedAgencies(agencies);
    // Update form field for validation (use first agency ID or empty string)
    form.setFieldValue('agencyId', agencies[0]?.id || '');
  };

  /**
   * Handles template selection and populates description
   */
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    form.setFieldValue('templateId', templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template?.templateText) {
      form.setFieldValue('description', template.templateText);
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
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100">Select Agencies</h2>
              <span className="text-sm text-accent-400">
                {selectedAgencies.length > 1 ? 'Bulk Filing Mode' : 'Single Request'}
              </span>
            </div>

            <form.Field name="agencyId">
              {(field) => (
                <div>
                  <span className="mb-2 block text-sm font-medium text-surface-300">
                    Search and select agencies (up to 20)
                  </span>
                  <MultiAgencySelector
                    agencies={agencies}
                    selectedAgencies={selectedAgencies}
                    onSelectionChange={(agencies) => {
                      handleAgencySelectionChange(agencies);
                      field.handleChange(agencies[0]?.id || '');
                    }}
                    loading={agenciesLoading}
                    placeholder="Type to search... (e.g., FBI, *police*, CA sheriff)"
                    maxSelection={20}
                  />
                  <p className="mt-2 text-xs text-surface-500">
                    Search {agencies.length} agencies by name, abbreviation, or location. Select
                    multiple agencies to send the same request to all of them.
                  </p>
                  {getFieldError(field) && selectedAgencies.length === 0 && (
                    <p className="mt-1 text-xs text-red-400">{getFieldError(field)}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Request Details</h2>

            <div className="space-y-4">
              <form.Field name="title">
                {(field) => (
                  <div>
                    <label htmlFor="title" className={labelClass}>
                      Request Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Brief title describing your request"
                      className={getInputClass(field)}
                    />
                    {getFieldError(field) && (
                      <p className="mt-1 text-xs text-red-400">{getFieldError(field)}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="category">
                {(field) => (
                  <div>
                    <label htmlFor="category" className={labelClass}>
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={getInputClass(field)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    {getFieldError(field) && (
                      <p className="mt-1 text-xs text-red-400">{getFieldError(field)}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {templates.length > 0 && (
                <div>
                  <label htmlFor="template" className={labelClass}>
                    Use Template <span className="text-surface-500">(optional)</span>
                  </label>
                  <select
                    id="template"
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
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

              <form.Field name="description">
                {(field) => (
                  <div>
                    <label htmlFor="description" className={labelClass}>
                      Request Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={6}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Describe in detail the records you are requesting..."
                      className={getInputClass(field)}
                    />
                    {getFieldError(field) && (
                      <p className="mt-1 text-xs text-red-400">{getFieldError(field)}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="dateRangeStart">
                  {(field) => (
                    <div>
                      <label htmlFor="dateRangeStart" className={labelClass}>
                        Date Range Start <span className="text-surface-500">(optional)</span>
                      </label>
                      <input
                        type="date"
                        id="dateRangeStart"
                        name="dateRangeStart"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className={getInputClass(field)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="dateRangeEnd">
                  {(field) => (
                    <div>
                      <label htmlFor="dateRangeEnd" className={labelClass}>
                        Date Range End <span className="text-surface-500">(optional)</span>
                      </label>
                      <input
                        type="date"
                        id="dateRangeEnd"
                        name="dateRangeEnd"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className={getInputClass(field)}
                      />
                      {getFieldError(field) && (
                        <p className="mt-1 text-xs text-red-400">{getFieldError(field)}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-surface-100">Request Options</h2>

            <div className="space-y-4">
              <form.Field name="isPublic">
                {(field) => (
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="isPublic"
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-surface-100">
                        Make Request Public
                      </span>
                      <p className="text-sm text-surface-400">
                        Allow others to view this request and its responses.
                      </p>
                    </div>
                  </label>
                )}
              </form.Field>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <a
              href="/dashboard"
              className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
            >
              Cancel
            </a>
            <form.Subscribe selector={(state) => [state.isSubmitting]}>
              {([isSubmitting]) => (
                <button
                  type="submit"
                  disabled={isSubmitting || selectedAgencies.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {submitProgress}
                    </>
                  ) : selectedAgencies.length > 1 ? (
                    `Create ${selectedAgencies.length} Requests`
                  ) : (
                    'Create Request'
                  )}
                </button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </main>
    </div>
  );
}
