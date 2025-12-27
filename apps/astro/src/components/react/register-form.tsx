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
 * @file Registration form component for new user accounts
 * @module components/react/RegisterForm
 */

import { Check, ChevronDown, FileText, Loader2, Shield, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { register, useAuthStore } from '@/stores/auth';

/**
 * Document type for the viewer modal
 */
type DocumentType = 'terms' | 'privacy' | null;

/**
 * Props for DocumentViewerModal
 */
interface DocumentViewerModalProps {
  type: DocumentType;
  onClose: () => void;
  onAccept: (type: 'terms' | 'privacy') => void;
}

/**
 * Modal component for viewing and accepting legal documents
 * User must scroll to the bottom before the accept button is enabled
 */
function DocumentViewerModal({ type, onClose, onAccept }: DocumentViewerModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * Check if user has scrolled to the bottom of the document
   */
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const scrollableHeight = scrollHeight - clientHeight;
    const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 100;

    setScrollProgress(Math.min(progress, 100));

    // Consider "scrolled to bottom" when within 20px of the end
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    // Check initial scroll state (in case content is short)
    handleScroll();
  }, [handleScroll]);

  if (!type) return null;

  // Check if we're in the browser
  if (typeof document === 'undefined') return null;

  const isTerms = type === 'terms';
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const Icon = isTerms ? FileText : Shield;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10">
              <Icon className="h-5 w-5 text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-100">{title}</h2>
              <p className="text-xs text-surface-500">Please read carefully before accepting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scroll Progress Indicator */}
        <div className="h-1 bg-surface-800">
          <div
            className="h-full bg-accent-500 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Document Content */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 text-sm text-surface-400 leading-relaxed"
        >
          {isTerms ? <TermsContent /> : <PrivacyContent />}

          {/* Scroll indicator at bottom */}
          {!hasScrolledToBottom && (
            <div className="sticky bottom-0 left-0 right-0 flex justify-center pb-4 pt-8 bg-linear-to-t from-surface-900 via-surface-900/90 to-transparent">
              <div className="flex items-center gap-2 text-accent-400 animate-bounce">
                <ChevronDown className="h-4 w-4" />
                <span className="text-xs">Scroll to continue reading</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>

        {/* Footer with Accept Button */}
        <div className="border-t border-surface-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-surface-500">
              {hasScrolledToBottom ? (
                <span className="flex items-center gap-1 text-green-400">
                  <Check className="h-3 w-3" />
                  Document reviewed
                </span>
              ) : (
                `Scroll to bottom to accept (${Math.round(scrollProgress)}%)`
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onAccept(type)}
                disabled={!hasScrolledToBottom}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" />I Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Terms of Service content component
 */
function TermsContent() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">1. Agreement to Terms</h3>
        <p>
          Welcome to FOIA Stream. These Terms of Service ("Terms") govern your access to and use of
          our Freedom of Information Act request management platform, including our website,
          applications, and services (collectively, the "Service").
        </p>
        <p className="mt-2">
          By creating an account or using our Service, you agree to be bound by these Terms and our
          Privacy Policy. If you do not agree to these Terms, you may not use the Service.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">2. Eligibility</h3>
        <p>To use FOIA Stream, you must:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
          <li>Be at least 13 years old (or 16 in the EU)</li>
          <li>Be capable of forming a binding legal contract</li>
          <li>Not be prohibited from using the Service under applicable law</li>
          <li>Provide accurate and complete registration information</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">3. Account Security</h3>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activities under your account. You agree to notify us immediately of any
          unauthorized use of your account.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">4. Acceptable Use</h3>
        <p>You agree NOT to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
          <li>Use the Service for any unlawful purpose</li>
          <li>Submit false or misleading FOIA requests</li>
          <li>Impersonate another person or entity</li>
          <li>Harass, abuse, or threaten others</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Use automated means without permission</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">5. Service Description</h3>
        <p>
          FOIA Stream provides tools to help you draft, submit, and track Freedom of Information Act
          requests to government agencies. We facilitate the submission of your requests but do not
          guarantee agency responses or the success of any particular request.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">6. Data Retention</h3>
        <p>
          In accordance with our data minimization practices, FOIA request content (titles and
          descriptions) are automatically purged 90 days after request completion. Metadata may be
          retained longer for your reference.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">
          7. Limitation of Liability
        </h3>
        <p>
          The Service is provided "as is" without warranties of any kind. We disclaim all
          warranties, including merchantability and fitness for a particular purpose. We shall not
          be liable for any indirect, incidental, special, or consequential damages.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">8. Termination</h3>
        <p>
          You may terminate your account at any time through your account settings. We may suspend
          or terminate your access for violation of these Terms or extended inactivity.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">9. Changes to Terms</h3>
        <p>
          We may modify these Terms at any time. We will notify you of material changes by posting a
          notice on the Service or sending you an email.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">10. Contact</h3>
        <p>For questions about these Terms, contact us at legal@foiastream.com.</p>
      </section>

      <div className="mt-8 p-4 rounded-lg bg-surface-800/50 border border-surface-700">
        <p className="text-xs text-surface-500 text-center">
          Last Updated: December 25, 2024 • Full terms available at{' '}
          <a
            href="/terms"
            target="_blank"
            className="text-accent-400 hover:text-accent-300"
            rel="noopener"
          >
            /terms
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Privacy Policy content component
 */
function PrivacyContent() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">1. Introduction</h3>
        <p>
          FOIA Stream ("we," "our," or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when you use
          our Freedom of Information Act request management service.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">2. Information We Collect</h3>
        <p>
          <strong className="text-surface-300">Information You Provide:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
          <li>Account information (email, name, organization)</li>
          <li>FOIA request content and metadata</li>
          <li>Communications with us</li>
        </ul>
        <p className="mt-3">
          <strong className="text-surface-300">Automatically Collected:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
          <li>Device information and browser type</li>
          <li>Usage data and analytics</li>
          <li>IP addresses (encrypted for security)</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">
          3. How We Use Your Information
        </h3>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Provide and improve our services</li>
          <li>Process and submit your FOIA requests</li>
          <li>Send status updates and notifications</li>
          <li>Authenticate and secure your account</li>
          <li>Detect and prevent security incidents</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">4. Data Sharing</h3>
        <p>
          We share your information with government agencies when you submit FOIA requests (this is
          the core function of our service). We may also share with service providers who help us
          operate the platform.
        </p>
        <p className="mt-2 text-red-400 font-medium">We never sell your personal data.</p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">5. Data Security</h3>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>AES-256-GCM encryption for sensitive data</li>
          <li>Argon2id password hashing</li>
          <li>Optional two-factor authentication</li>
          <li>Regular security audits</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">6. Data Retention</h3>
        <div className="overflow-hidden rounded-lg border border-surface-700 mt-2">
          <table className="w-full text-xs">
            <thead className="bg-surface-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-surface-300">Data Type</th>
                <th className="px-3 py-2 text-left font-medium text-surface-300">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              <tr>
                <td className="px-3 py-2">Account Information</td>
                <td className="px-3 py-2">Until deletion</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Request Content</td>
                <td className="px-3 py-2 text-accent-400 font-medium">90 days after completion</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Session Data</td>
                <td className="px-3 py-2">30 days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">7. Your Rights</h3>
        <p>You have the right to:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your data and account</li>
          <li>Export your data</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p className="mt-2">
          California residents have additional rights under CCPA. EU residents have rights under
          GDPR.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">8. Cookies</h3>
        <p>
          We use essential cookies only for authentication and security. We do not use advertising
          or tracking cookies.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-surface-200 mb-2">9. Contact</h3>
        <p>
          For privacy questions, contact us at privacy@foiastream.com. For GDPR inquiries, contact
          our Data Protection Officer at dpo@foiastream.com.
        </p>
      </section>

      <div className="mt-8 p-4 rounded-lg bg-surface-800/50 border border-surface-700">
        <p className="text-xs text-surface-500 text-center">
          Last Updated: December 25, 2024 • Full policy available at{' '}
          <a
            href="/privacy"
            target="_blank"
            className="text-accent-400 hover:text-accent-300"
            rel="noopener"
          >
            /privacy
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Registration form component that handles new user account creation
 *
 * @component
 * @returns {React.JSX.Element | null} Registration form or null during redirect
 *
 * @example
 * ```tsx
 * <RegisterForm />
 * ```
 */
export default function RegisterForm() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organization: '',
  });
  const [consents, setConsents] = useState({
    termsAccepted: false,
    privacyAccepted: false,
    dataProcessingAccepted: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentType>(null);

  /**
   * Handle accepting a document after scrolling through it
   */
  const handleDocumentAccept = (type: 'terms' | 'privacy') => {
    setConsents((prev) => ({
      ...prev,
      [type === 'terms' ? 'termsAccepted' : 'privacyAccepted']: true,
    }));
    setViewingDocument(null);
  };

  if (!authLoading && isAuth) {
    window.location.href = '/dashboard';
    return null;
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  /**
   * Handles input field changes
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /**
   * Handles consent checkbox changes
   * @param {React.ChangeEvent<HTMLInputElement>} e - Checkbox change event
   */
  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsents((prev) => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }));
  };

  /**
   * Handles form submission for registration
   * @param {React.FormEvent} e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!consents.termsAccepted || !consents.privacyAccepted || !consents.dataProcessingAccepted) {
      setError('You must accept all agreements to create an account');
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      organization: formData.organization || undefined,
      consents: {
        termsAccepted: consents.termsAccepted,
        privacyAccepted: consents.privacyAccepted,
        dataProcessingAccepted: consents.dataProcessingAccepted,
        consentTimestamp: new Date().toISOString(),
      },
    });

    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'mt-2 block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-surface-300">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={formData.firstName}
            onChange={handleChange}
            className={inputClass}
            placeholder="John"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-surface-300">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            value={formData.lastName}
            onChange={handleChange}
            className={inputClass}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-surface-300">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="organization" className="block text-sm font-medium text-surface-300">
          Organization <span className="text-surface-500">(optional)</span>
        </label>
        <input
          id="organization"
          name="organization"
          type="text"
          autoComplete="organization"
          value={formData.organization}
          onChange={handleChange}
          className={inputClass}
          placeholder="News Organization"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-surface-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          className={inputClass}
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-surface-500">Must be at least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-300">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          type={viewingDocument}
          onClose={() => setViewingDocument(null)}
          onAccept={handleDocumentAccept}
        />
      )}

      {/* Legal Agreements Section */}
      <div className="space-y-4 rounded-lg border border-surface-700 bg-surface-900/50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-surface-300">Legal Agreements</p>
          <span className="text-xs text-surface-500">All required</span>
        </div>

        {/* Terms of Service - Read & Accept */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-surface-700 bg-surface-800/50">
          <div className="flex items-center gap-3">
            {consents.termsAccepted ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-4 w-4 text-green-400" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-700">
                <FileText className="h-4 w-4 text-surface-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-surface-200">Terms of Service</p>
              <p className="text-xs text-surface-500">
                {consents.termsAccepted ? 'Accepted' : 'Review required'}
              </p>
            </div>
          </div>
          {consents.termsAccepted ? (
            <button
              type="button"
              onClick={() => {
                setConsents((prev) => ({ ...prev, termsAccepted: false }));
              }}
              className="text-xs text-surface-500 hover:text-surface-300"
            >
              Reset
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewingDocument('terms')}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-1.5 text-xs font-medium text-accent-400 hover:bg-accent-500/20 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Read & Accept
            </button>
          )}
        </div>

        {/* Privacy Policy - Read & Accept */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-surface-700 bg-surface-800/50">
          <div className="flex items-center gap-3">
            {consents.privacyAccepted ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-4 w-4 text-green-400" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-700">
                <Shield className="h-4 w-4 text-surface-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-surface-200">Privacy Policy</p>
              <p className="text-xs text-surface-500">
                {consents.privacyAccepted ? 'Accepted' : 'Review required'}
              </p>
            </div>
          </div>
          {consents.privacyAccepted ? (
            <button
              type="button"
              onClick={() => {
                setConsents((prev) => ({ ...prev, privacyAccepted: false }));
              }}
              className="text-xs text-surface-500 hover:text-surface-300"
            >
              Reset
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewingDocument('privacy')}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-1.5 text-xs font-medium text-accent-400 hover:bg-accent-500/20 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Read & Accept
            </button>
          )}
        </div>

        {/* Data Processing Consent - Simple Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-surface-700 bg-surface-800/50 hover:border-surface-600 transition-colors">
          <input
            type="checkbox"
            name="dataProcessingAccepted"
            checked={consents.dataProcessingAccepted}
            onChange={handleConsentChange}
            className="mt-0.5 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500 focus:ring-offset-0"
          />
          <div>
            <p className="text-sm text-surface-300 group-hover:text-surface-200">
              Data Processing Consent
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              I consent to the processing of my FOIA requests and understand that request content is
              retained for up to 90 days after completion.
            </p>
          </div>
        </label>

        <p className="text-xs text-surface-500 pt-2 border-t border-surface-800">
          You can withdraw consent at any time in your{' '}
          <a href="/settings" className="text-accent-400 hover:text-accent-300">
            account settings
          </a>
          .
        </p>
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting ||
          !consents.termsAccepted ||
          !consents.privacyAccepted ||
          !consents.dataProcessingAccepted
        }
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create account'
        )}
      </button>
    </form>
  );
}
