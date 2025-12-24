/**
 * @file Authentication state management using nanostores
 * @module stores/auth
 */

import { atom, computed } from 'nanostores';
import { api, type User } from '@/lib/api';

/**
 * Reactive store for the current authenticated user
 * @constant
 * @type {WritableAtom<User | null>}
 */
export const $user = atom<User | null>(null);

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

  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    $token.set(storedToken);
    api.getProfile().then((response) => {
      if (response.success && response.data) {
        $user.set(response.data);
      } else {
        localStorage.removeItem('token');
        $token.set(null);
      }
      $isLoading.set(false);
    });
  } else {
    $isLoading.set(false);
  }
}

/**
 * Authenticates a user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 * @example
 * const result = await login('user@example.com', 'password123');
 * if (result.success) {
 *   window.location.href = '/dashboard';
 * }
 */
export async function login(email: string, password: string) {
  const response = await api.login({ email, password });

  if (response.success && response.data) {
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    $token.set(token);
    $user.set(user);
    return { success: true };
  }

  return { success: false, error: response.error || 'Login failed' };
}

/**
 * Registers a new user account
 * @param {Object} data - Registration data
 * @param {string} data.email - User email address
 * @param {string} data.password - User password
 * @param {string} data.firstName - User first name
 * @param {string} data.lastName - User last name
 * @param {string} [data.organization] - Optional organization name
 * @returns {Promise<{success: boolean, error?: string}>} Result object
 */
export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organization?: string;
}) {
  const response = await api.register(data);

  if (response.success && response.data) {
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    $token.set(token);
    $user.set(user);
    return { success: true };
  }

  return { success: false, error: response.error || 'Registration failed' };
}

/**
 * Logs out the current user and clears auth state
 * @returns {Promise<void>}
 */
export async function logout() {
  await api.logout();
  localStorage.removeItem('token');
  $token.set(null);
  $user.set(null);
}

/**
 * Refreshes the current user's profile data from the API
 * @returns {Promise<void>}
 */
export async function refreshUser() {
  const token = $token.get();
  if (!token) return;

  const response = await api.getProfile();
  if (response.success && response.data) {
    $user.set(response.data);
  }
}
