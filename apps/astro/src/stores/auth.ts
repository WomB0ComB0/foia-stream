/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Authentication state management using Zustand
 * @module stores/auth
 */

import { create } from 'zustand';
import { api, type User } from '@/lib/api';

// ============================================
// Types
// ============================================

<<<<<<< HEAD
/**
 * Reactive store for the JWT authentication token
 * @constant
 * @type {WritableAtom<string | null>}
 */
export const $token = atom<string | null>(null);

/**
 * Reactive store indicating if auth state is being loaded
 * @constant
 * @type {WritableAtom<boolean>}
 */
export const $isLoading = atom(true);

/**
 * Computed store that returns true if a user is authenticated
 * @constant
 * @type {ReadableAtom<boolean>}
 */
export const $isAuthenticated = computed($user, (user) => user !== null);

/**
 * Initializes authentication state from localStorage
 * Should be called on app startup in browser environment
 * @returns {void}
 */
export function initAuth() {
  if (typeof window === 'undefined') return;

  const storedToken = localStorage.getItem('auth_token');
  if (storedToken) {
    $token.set(storedToken);
    api.getProfile().then((response) => {
      if (response.success && response.data) {
        $user.set(response.data);
      } else {
        localStorage.removeItem('auth_token');
        $token.set(null);
      }
      $isLoading.set(false);
    });
  } else {
    $isLoading.set(false);
  }
}

/**
 * MFA pending state for two-step login
 */
=======
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
interface MFAPendingState {
  mfaToken: string;
  user: User;
}

interface ConsentData {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataProcessingAccepted: boolean;
  consentTimestamp: string;
}

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
};

/**
 * @deprecated Use useAuthStore hook instead
 */
export const $isAuthenticated = {
  get: () => useAuthStore.getState().isAuthenticated,
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
  const storedToken = localStorage.getItem('token');

  if (storedToken) {
    setToken(storedToken);
    api.getProfile().then((response) => {
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        localStorage.removeItem('token');
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

<<<<<<< HEAD
    localStorage.setItem('auth_token', token);
    $token.set(token);
    $user.set(user);
=======
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
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
<<<<<<< HEAD
    localStorage.setItem('auth_token', response.data.token);
    $token.set(response.data.token);
    $user.set(pending.user);
    $mfaPending.set(null);
=======
    localStorage.setItem('token', response.data.token);
    setToken(response.data.token);
    setUser(mfaPending.user);
    setMfaPending(null);
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
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
<<<<<<< HEAD
    localStorage.setItem('auth_token', token);
    $token.set(token);
    $user.set(user);
=======
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
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
<<<<<<< HEAD
  localStorage.removeItem('auth_token');
  $token.set(null);
  $user.set(null);
=======
  localStorage.removeItem('token');
  setToken(null);
  setUser(null);
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
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
