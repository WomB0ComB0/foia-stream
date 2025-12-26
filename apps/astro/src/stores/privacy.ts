/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Privacy mode state management using Zustand
 * @module stores/privacy
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================

interface PrivacyState {
  /** Whether privacy mode is enabled (redacts sensitive info) */
  privacyMode: boolean;
  /** Toggle privacy mode on/off */
  togglePrivacy: () => void;
  /** Set privacy mode explicitly */
  setPrivacyMode: (enabled: boolean) => void;
}

// ============================================
// Zustand Store with Persistence
// ============================================

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      privacyMode: false,
      togglePrivacy: () => set((state) => ({ privacyMode: !state.privacyMode })),
      setPrivacyMode: (enabled) => set({ privacyMode: enabled }),
    }),
    {
      name: 'foia-privacy',
    },
  ),
);

// ============================================
// Redaction Patterns
// ============================================

/** SSN pattern: 123-45-6789 or 123456789 */
const SSN_PATTERN = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;

/** Email pattern */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Phone patterns: (123) 456-7890, 123-456-7890, 123.456.7890 */
const PHONE_PATTERN = /\b(\+1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

/** Credit card pattern: 1234-5678-9012-3456 or 1234567890123456 */
const CREDIT_CARD_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

// ============================================
// Redaction Functions
// ============================================

/**
 * Redacts an SSN to ***-**-****
 */
function redactSSN(text: string): string {
  return text.replace(SSN_PATTERN, '***-**-****');
}

/**
 * Redacts an email to j***@***.com format
 */
function redactEmail(email: string): string {
  return email.replace(EMAIL_PATTERN, (match) => {
    const [local, domain] = match.split('@');
    if (!local || !domain) return '***@***.***';
    const domainParts = domain.split('.');
    const tld = domainParts.pop() || '***';
    return `${local[0]}***@***.${tld}`;
  });
}

/**
 * Redacts a phone number to (***) ***-****
 */
function redactPhone(text: string): string {
  return text.replace(PHONE_PATTERN, '(***) ***-****');
}

/**
 * Redacts credit card to ****-****-****-1234
 */
function redactCreditCard(text: string): string {
  return text.replace(CREDIT_CARD_PATTERN, (match) => {
    const digits = match.replace(/[-\s]/g, '');
    return `****-****-****-${digits.slice(-4)}`;
  });
}

/**
 * Redacts all sensitive information from a text string
 * @param text - Text to redact
 * @returns Redacted text with sensitive info masked
 * @example
 * redactSensitive('SSN: 123-45-6789') // 'SSN: ***-**-****'
 * redactSensitive('email: john@example.com') // 'email: j***@***.com'
 */
export function redactSensitive(text: string | null | undefined): string {
  if (!text) return '';

  let result = text;
  result = redactSSN(result);
  result = redactEmail(result);
  result = redactPhone(result);
  result = redactCreditCard(result);

  return result;
}

/**
 * Conditionally redacts text based on privacy mode
 * @param text - Text to potentially redact
 * @param privacyMode - Whether privacy mode is enabled
 * @returns Original text or redacted version
 */
export function maybeRedact(text: string | null | undefined, privacyMode: boolean): string {
  if (!text) return '';
  return privacyMode ? redactSensitive(text) : text;
}

/**
 * Redacts a name to "J*** D***" format
 */
export function redactName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const first = firstName || '';
  const last = lastName || '';

  const redactedFirst =
    first.length > 0 ? `${first[0]}${'*'.repeat(Math.max(first.length - 1, 2))}` : '';
  const redactedLast =
    last.length > 0 ? `${last[0]}${'*'.repeat(Math.max(last.length - 1, 2))}` : '';

  return `${redactedFirst} ${redactedLast}`.trim();
}
