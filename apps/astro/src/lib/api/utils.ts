/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Shared API utilities for Effect-based HTTP client
 * @module lib/api/utils
 * @description Re-exports utilities from shared package and adds app-specific helpers.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

// Re-export shared utilities
export {
  HttpClientLive,
  runEffect,
  type ApiResponse,
} from '@foia-stream/shared';

// ============================================
// Auth Helpers (App-specific)
// ============================================

/**
 * Retrieves the authentication token from local storage
 * @returns The auth token or null if not found
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Builds authorization headers with the current token
 * @returns Headers object with Authorization if token exists
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality)
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
