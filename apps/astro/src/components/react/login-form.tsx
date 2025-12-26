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
 * @file Login form component for user authentication with 2FA support
 * @module components/react/LoginForm
 */

import { ArrowLeft, Eye, EyeOff, Key, Loader2, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cancelMFALogin, login, useAuthStore, verifyMFALogin } from '@/stores/auth';

/**
 * Login form component that handles user authentication with 2FA support
 *
 * @component
 * @returns {React.JSX.Element | null} Login form or null during redirect
 */
export default function LoginForm() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const mfaPending = useAuthStore((s) => s.mfaPending);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mfaCode, setMfaCode] = useState('');
  const mfaInputRef = useRef<HTMLInputElement | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mfaPending) {
      if (useBackupCode && backupInputRef.current) {
        backupInputRef.current.focus();
      } else if (!useBackupCode && mfaInputRef.current) {
        mfaInputRef.current.focus();
      }
    }
  }, [mfaPending, useBackupCode]);

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
   * Handles form submission for initial login
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      window.location.href = '/dashboard';
    } else if (result.requiresMFA) {
      setIsSubmitting(false);
    } else {
      setError(result.error || 'Login failed');
      setIsSubmitting(false);
    }
  };

  /**
   * Handles MFA code input with auto-submit on completion
   * @param {string} value - Input value from the TOTP field
   */
  const handleMfaInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setMfaCode(cleaned);
    if (cleaned.length === 6) {
      handleMfaSubmit(cleaned);
    }
  };

  /**
   * Submits MFA code for verification
   * @param {string} [code] - Optional code override, defaults to state value
   */
  const handleMfaSubmit = async (code?: string) => {
    const fullCode = code || mfaCode;
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const result = await verifyMFALogin(fullCode);

    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error || 'Invalid code');
      setMfaCode('');
      mfaInputRef.current?.focus();
      setIsSubmitting(false);
    }
  };

  /**
   * Cancels MFA and returns to login form
   */
  const handleCancelMfa = () => {
    cancelMFALogin();
    setMfaCode('');
    setBackupCode('');
    setUseBackupCode(false);
    setError('');
  };

  /**
   * Formats backup code input with automatic dash insertion
   * @param {string} value - Raw input value
   */
  const handleBackupCodeChange = (value: string) => {
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const withoutDash = cleaned.replace(/-/g, '');
    cleaned =
      withoutDash.length > 4
        ? `${withoutDash.slice(0, 4)}-${withoutDash.slice(4, 8)}`
        : withoutDash;
    setBackupCode(cleaned);
  };

  /**
   * Submits backup code for verification
   */
  const handleBackupCodeSubmit = async () => {
    const code = backupCode.replace(/-/g, '');
    if (code.length !== 8) {
      setError('Backup code must be 8 characters');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const result = await verifyMFALogin(backupCode);

    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error || 'Invalid backup code');
      setBackupCode('');
      backupInputRef.current?.focus();
      setIsSubmitting(false);
    }
  };

  /**
   * Toggles between TOTP and backup code entry
   */
  const toggleBackupMode = () => {
    setUseBackupCode(!useBackupCode);
    setError('');
    setMfaCode('');
    setBackupCode('');
  };

  if (mfaPending) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleCancelMfa}
          className="flex items-center gap-2 text-sm text-surface-400 transition-colors hover:text-surface-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/10">
            {useBackupCode ? (
              <Key className="h-8 w-8 text-accent-400" />
            ) : (
              <Shield className="h-8 w-8 text-accent-400" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-surface-100">
            {useBackupCode ? 'Backup Code' : 'Two-Factor Authentication'}
          </h2>
          <p className="mt-2 text-sm text-surface-400">
            {useBackupCode
              ? 'Enter one of your backup codes (format: XXXX-XXXX)'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {useBackupCode ? (
          <div className="space-y-4">
            <input
              ref={backupInputRef}
              type="text"
              value={backupCode}
              onChange={(e) => handleBackupCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && backupCode.replace(/-/g, '').length === 8) {
                  handleBackupCodeSubmit();
                }
              }}
              placeholder="XXXX-XXXX"
              maxLength={9}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-center font-mono text-xl tracking-widest text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleBackupCodeSubmit}
              disabled={isSubmitting || backupCode.replace(/-/g, '').length !== 8}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Use Backup Code'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={mfaInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              name="totp"
              value={mfaCode}
              onChange={(e) => handleMfaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mfaCode.length === 6) {
                  handleMfaSubmit();
                }
              }}
              placeholder="000000"
              maxLength={6}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-4 text-center font-mono text-3xl tracking-[0.5em] text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
            />
            <p className="text-center text-xs text-surface-500">
              Your password manager can autofill this code
            </p>
            <button
              type="button"
              onClick={() => handleMfaSubmit()}
              disabled={isSubmitting || mfaCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={toggleBackupMode}
          className="flex w-full items-center justify-center gap-2 text-sm text-surface-400 transition-colors hover:text-surface-100"
        >
          {useBackupCode ? (
            <>
              <Shield className="h-4 w-4" />
              Use authenticator app instead
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              Use a backup code instead
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-surface-300">
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-sm text-accent-400 transition-colors hover:text-accent-300"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 pr-12 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 transition-colors hover:text-surface-300"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
