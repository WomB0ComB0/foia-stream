/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Authentication state management using Zustand with Effect Schema validation
 * @module stores/auth
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import { api, type User } from '@/lib/api';
import { Schema as S } from 'effect';
import { create } from 'zustand';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Schema for MFA pending state during two-step login
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
const MFAPendingStateSchema = S.Struct({
  mfaToken: S.String.pipe(S.nonEmptyString()),
  user: S.Any, // User type is validated by api.ts
});
type MFAPendingState = S.Schema.Type<typeof MFAPendingStateSchema>;

/**
 * Schema for consent data during registration
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
const ConsentDataSchema = S.Struct({
  termsAccepted: S.Boolean,
  privacyAccepted: S.Boolean,
  dataProcessingAccepted: S.Boolean,
  consentTimestamp: S.String.pipe(S.nonEmptyString()),
});
type ConsentData = S.Schema.Type<typeof ConsentDataSchema>;

// ============================================
// Auth State Interface
// ============================================

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  mfaPending: MFAPendingState | null;

  // Computed
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setMfaPending: (pending: MFAPendingState | null) => void;
}

// ============================================
// Zustand Store
// ============================================

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  token: null,
  isLoading: true,
  mfaPending: null,
  isAuthenticated: false,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  setMfaPending: (mfaPending) => set({ mfaPending }),
}));

// ============================================
// Legacy Exports for Backward Compatibility
// ============================================

/**
 * @deprecated Use useAuthStore hook instead
 */
export const $user = {
  get: () => useAuthStore.getState().user,
  set: (user: User | null) => useAuthStore.getState().setUser(user),
  subscribe: (callback: (user: User | null) => void) => {
    let prev = useAuthStore.getState().user;
    return useAuthStore.subscribe((state) => {
      if (state.user !== prev) {
        prev = state.user;
        callback(state.user);
      }
    });
  },
};

/**
 * @deprecated Use useAuthStore hook instead
 */
export const $token = {
  get: () => useAuthStore.getState().token,
  set: (token: string | null) => useAuthStore.getState().setToken(token),
};

/**
 * @deprecated Use useAuthStore hook instead
 */
export const $isLoading = {
  get: () => useAuthStore.getState().isLoading,
  set: (loading: boolean) => useAuthStore.getState().setLoading(loading),
  subscribe: (callback: (isLoading: boolean) => void) => {
    let prev = useAuthStore.getState().isLoading;
    return useAuthStore.subscribe((state) => {
      if (state.isLoading !== prev) {
        prev = state.isLoading;
        callback(state.isLoading);
      }
    });
  },
};

/**
 * @deprecated Use useAuthStore hook instead
 */
export const $isAuthenticated = {
  get: () => useAuthStore.getState().isAuthenticated,
  subscribe: (callback: (isAuthenticated: boolean) => void) => {
    let prev = useAuthStore.getState().isAuthenticated;
    return useAuthStore.subscribe((state) => {
      if (state.isAuthenticated !== prev) {
        prev = state.isAuthenticated;
        callback(state.isAuthenticated);
      }
    });
  },
};

/**
 * @deprecated Use useAuthStore hook instead
 */
export const $mfaPending = {
  get: () => useAuthStore.getState().mfaPending,
  set: (pending: MFAPendingState | null) => useAuthStore.getState().setMfaPending(pending),
};

// ============================================
// Auth Functions
// ============================================

/**
 * Initializes authentication state from localStorage
 */
export function initAuth() {
  if (typeof window === 'undefined') return;

  const { setToken, setUser, setLoading } = useAuthStore.getState();
  const storedToken = localStorage.getItem('auth_token');

  if (storedToken) {
    setToken(storedToken);
    api.getProfile().then((response) => {
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        localStorage.removeItem('auth_token');
        setToken(null);
      }
      setLoading(false);
    });
  } else {
    setLoading(false);
  }
}

/**
 * Authenticates a user with email and password
 */
export async function login(email: string, password: string) {
  const { setToken, setUser, setMfaPending } = useAuthStore.getState();
  const response = await api.login(email, password);

  if (response.success && response.data) {
    const { token, user, requiresMFA, mfaToken } = response.data;

    if (requiresMFA && mfaToken) {
      setMfaPending({ mfaToken, user });
      return { success: false, requiresMFA: true };
    }

    localStorage.setItem('auth_token', token);
    setToken(token);
    setUser(user);
    return { success: true };
  }

  return { success: false, error: response.error || 'Login failed' };
}

/**
 * Completes MFA verification during login
 */
export async function verifyMFALogin(code: string) {
  const { mfaPending, setToken, setUser, setMfaPending } = useAuthStore.getState();

  if (!mfaPending) {
    return { success: false, error: 'No pending MFA verification' };
  }

  const response = await api.verifyMFALogin(mfaPending.mfaToken, code);

  if (response.success && response.data) {
    localStorage.setItem('auth_token', response.data.token);
    setToken(response.data.token);
    setUser(mfaPending.user);
    setMfaPending(null);
    return { success: true };
  }

  return { success: false, error: response.error || 'MFA verification failed' };
}

/**
 * Cancels pending MFA verification
 */
export function cancelMFALogin() {
  useAuthStore.getState().setMfaPending(null);
}

/**
 * Registers a new user account
 */
export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organization?: string;
  consents?: ConsentData;
}) {
  const { setToken, setUser } = useAuthStore.getState();
  const response = await api.register(data);

  if (response.success && response.data) {
    const { token, user } = response.data;
    localStorage.setItem('auth_token', token);
    setToken(token);
    setUser(user);
    return { success: true };
  }

  return { success: false, error: response.error || 'Registration failed' };
}

/**
 * Logs out the current user and clears auth state
 */
export async function logout() {
  const { setToken, setUser } = useAuthStore.getState();
  await api.logout();
  localStorage.removeItem('auth_token');
  setToken(null);
  setUser(null);
}

/**
 * Refreshes the current user's profile data from the API
 */
export async function refreshUser() {
  const { token, setUser } = useAuthStore.getState();
  if (!token) return;

  const response = await api.getProfile();
  if (response.success && response.data) {
    setUser(response.data);
  }
}
