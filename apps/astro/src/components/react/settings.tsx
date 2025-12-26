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
 * @file User settings and account management component
 * @module components/react/Settings
 */

import { api, type User as UserType } from '@/lib/api';
import { initAuth, refreshUser, useAuthStore } from '@/stores/auth';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  Monitor,
  RefreshCw,
  Settings2,
  Shield,
  Smartphone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PrivacyToggleCompact } from './privacy-toggle';

type TabId = 'profile' | 'security' | 'preferences' | 'api' | 'danger';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="h-5 w-5" />,
    description: 'Manage your personal information',
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className="h-5 w-5" />,
    description: 'Password and authentication',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: <Settings2 className="h-5 w-5" />,
    description: 'Notifications and reminders',
  },
  {
    id: 'api',
    label: 'API Keys',
    icon: <Key className="h-5 w-5" />,
    description: 'Manage API access',
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: <AlertTriangle className="h-5 w-5" />,
    description: 'Irreversible actions',
  },
];

/**
 * Settings page component with tabbed interface
 * @component
 */
export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuth) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuth]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (!isAuth || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <a
              href="/dashboard"
              className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-surface-100">Settings</h1>
              <p className="text-sm text-surface-400">Manage your account preferences</p>
            </div>
            <PrivacyToggleCompact />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <nav className="lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-1">
              {TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-accent-500/10 text-accent-400'
                      : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-200'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-accent-400' : 'text-surface-500'}>
                    {tab.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-surface-500">{tab.description}</div>
                  </div>
                  {activeTab === tab.id && <ChevronRight className="h-4 w-4 text-accent-400" />}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && <ProfileTab user={user} />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
            {activeTab === 'api' && <ApiKeysTab />}
            {activeTab === 'danger' && <DangerZoneTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileTab({ user }: { user: UserType }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    organization: user.organization || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    const response = await api.updateProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      organization: formData.organization || undefined,
    });

    if (response.success) {
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await refreshUser();
    } else {
      setError(response.error || 'Failed to update profile');
    }
    setIsSaving(false);
  };

  const inputClass =
    'block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-surface-100">Profile Information</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
            >
              Edit
            </button>
          )}
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="settings-first-name"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                First Name
              </label>
              <input
                id="settings-first-name"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="settings-last-name"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Last Name
              </label>
              <input
                id="settings-last-name"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-email"
              className="mb-2 block text-sm font-medium text-surface-300"
            >
              Email Address
            </label>
            <input
              id="settings-email"
              type="email"
              value={formData.email}
              disabled
              className={`${inputClass} cursor-not-allowed`}
            />
            <p className="mt-1 text-xs text-surface-500">Contact support to change your email</p>
          </div>

          <div>
            <label
              htmlFor="settings-organization"
              className="mb-2 block text-sm font-medium text-surface-300"
            >
              Organization
            </label>
            <input
              id="settings-organization"
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              disabled={!isEditing}
              placeholder="Your organization (optional)"
              className={inputClass}
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-surface-300">Role</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-lg bg-accent-500/10 px-3 py-1.5 text-sm font-medium text-accent-400 capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-surface-300">Member Since</span>
            <p className="text-surface-100">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  organization: user.organization || '',
                });
              }}
              className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityTab() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<{
    enabled: boolean;
    backupCodesRemaining?: number;
  } | null>(null);
  const [loadingMFA, setLoadingMFA] = useState(true);

  const loadMFAStatus = useCallback(async () => {
    setLoadingMFA(true);
    const response = await api.getMFAStatus();
    if (response.success && response.data) {
      setMfaStatus(response.data);
    }
    setLoadingMFA(false);
  }, []);

  useEffect(() => {
    loadMFAStatus();
  }, [loadMFAStatus]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-surface-800 p-3">
              <Lock className="h-6 w-6 text-surface-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Password</h3>
              <p className="text-sm text-surface-400">Change your account password</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
          >
            Change Password
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-surface-800 p-3">
              <Smartphone className="h-6 w-6 text-surface-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Two-Factor Authentication</h3>
              <p className="text-sm text-surface-400">
                {loadingMFA
                  ? 'Loading...'
                  : mfaStatus?.enabled
                    ? 'Your account is protected with 2FA'
                    : 'Add an extra layer of security'}
              </p>
              {mfaStatus?.enabled && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  <Check className="h-3 w-3" />
                  Enabled
                  {mfaStatus.backupCodesRemaining !== undefined && (
                    <span className="ml-1 text-surface-500">
                      ({mfaStatus.backupCodesRemaining} backup codes left)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShow2FAModal(true)}
            disabled={loadingMFA}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              mfaStatus?.enabled
                ? 'border border-surface-700 text-surface-300 hover:border-surface-600 hover:bg-surface-800'
                : 'bg-accent-500 text-surface-950 hover:bg-accent-400'
            }`}
          >
            {mfaStatus?.enabled ? 'Manage 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-surface-800 p-3">
              <Monitor className="h-6 w-6 text-surface-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Active Sessions</h3>
              <p className="text-sm text-surface-400">Manage devices where you're logged in</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSessionsModal(true)}
            className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
          >
            View Sessions
          </button>
        </div>
      </div>

      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />}

      {show2FAModal && (
        <TwoFactorModal
          enabled={mfaStatus?.enabled ?? false}
          onClose={() => {
            setShow2FAModal(false);
            loadMFAStatus();
          }}
        />
      )}

      {showSessionsModal && <SessionsModal onClose={() => setShowSessionsModal(false)} />}
    </div>
  );
}

function PreferencesTab() {
  const [passwordReminder, setPasswordReminder] = useState('90');
  const [emailNotifications, setEmailNotifications] = useState({
    requestUpdates: true,
    deadlineReminders: true,
    weeklyDigest: false,
    marketingEmails: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSuccess('Preferences saved successfully');
    setIsSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Password Reminder */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="rounded-xl bg-surface-800 p-3">
            <Lock className="h-6 w-6 text-surface-400" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-100">Password Change Reminder</h3>
            <p className="text-sm text-surface-400">
              How often should we remind you to change your password?
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            {
              value: '30',
              label: '30 days',
              description: 'Recommended for high-security accounts',
            },
            { value: '90', label: '90 days', description: 'Standard security practice' },
            { value: 'never', label: 'Never', description: 'Not recommended' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                passwordReminder === option.value
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
              }`}
            >
              <input
                type="radio"
                name="passwordReminder"
                value={option.value}
                checked={passwordReminder === option.value}
                onChange={(e) => setPasswordReminder(e.target.value)}
                className="sr-only"
              />
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  passwordReminder === option.value
                    ? 'border-accent-500 bg-accent-500'
                    : 'border-surface-500'
                }`}
              >
                {passwordReminder === option.value && (
                  <div className="h-1.5 w-1.5 rounded-full bg-surface-950" />
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium text-surface-100">{option.label}</span>
                <p className="text-xs text-surface-500">{option.description}</p>
              </div>
              {option.value === 'never' && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                  ⚠️ Risk
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Email Notifications */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-xl bg-surface-800 p-3">
            <Bell className="h-6 w-6 text-surface-400" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-100">Email Notifications</h3>
            <p className="text-sm text-surface-400">Choose what updates you want to receive</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              key: 'requestUpdates',
              label: 'Request Updates',
              description: 'Notifications when your FOIA requests are updated',
            },
            {
              key: 'deadlineReminders',
              label: 'Deadline Reminders',
              description: 'Reminders before agency response deadlines',
            },
            {
              key: 'weeklyDigest',
              label: 'Weekly Digest',
              description: 'Weekly summary of all your request activity',
            },
            {
              key: 'marketingEmails',
              label: 'Product Updates',
              description: 'News about new features and improvements',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800/50 p-4"
            >
              <div>
                <p className="font-medium text-surface-100">{item.label}</p>
                <p className="text-xs text-surface-500">{item.description}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEmailNotifications({
                    ...emailNotifications,
                    [item.key]: !emailNotifications[item.key as keyof typeof emailNotifications],
                  })
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  emailNotifications[item.key as keyof typeof emailNotifications]
                    ? 'bg-accent-500'
                    : 'bg-surface-600'
                }`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                    emailNotifications[item.key as keyof typeof emailNotifications]
                      ? 'left-6'
                      : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Export Data */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-surface-800 p-3">
              <Download className="h-6 w-6 text-surface-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">Export Your Data</h3>
              <p className="text-sm text-surface-400">
                Download a copy of all your data (GDPR compliant)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
          >
            Request Export
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [apiKey, setApiKey] = useState<{
    id: string;
    keyPreview?: string;
    name: string;
    createdAt: string;
    lastUsedAt?: string | null;
  } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadApiKey = useCallback(async () => {
    setLoading(true);
    const response = await api.getApiKey();
    if (response.success) {
      setApiKey(response.data ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  const handleCreateKey = async (password: string, twoFactorCode?: string) => {
    const response = await api.createApiKey(password, twoFactorCode);
    if (response.success && response.data) {
      setNewKey(response.data.key ?? null);
      await loadApiKey();
      return true;
    }
    throw new Error(response.error || 'Failed to create API key');
  };

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-surface-100">API Key</h2>
        <p className="mb-6 text-sm text-surface-400">
          Use this key to authenticate API requests. Keep it secret and never share it publicly.
        </p>

        {newKey && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-400">
              <Check className="h-4 w-4" />
              New API Key Generated
            </div>
            <p className="mb-3 text-xs text-surface-400">
              Copy this key now. You won't be able to see it again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-surface-800 px-4 py-2 font-mono text-sm text-surface-100 break-all">
                {newKey}
              </code>
              <button
                type="button"
                onClick={copyToClipboard}
                className="shrink-0 rounded-lg border border-surface-700 p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {apiKey ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-surface-700 bg-surface-800 p-4">
              <div>
                <p className="font-medium text-surface-100">{apiKey.name}</p>
                <p className="font-mono text-sm text-surface-400">{apiKey.keyPreview}</p>
                <p className="mt-1 text-xs text-surface-500">
                  Created {new Date(apiKey.createdAt).toLocaleDateString()}
                  {apiKey.lastUsedAt &&
                    ` • Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate Key
            </button>
            <p className="text-xs text-surface-500">
              Regenerating will invalidate the current key. All applications using the old key will
              stop working.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Key className="mx-auto mb-4 h-12 w-12 text-surface-600" />
            <p className="mb-4 text-surface-400">No API key generated yet</p>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
            >
              <Key className="h-4 w-4" />
              Generate API Key
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6">
        <h3 className="mb-4 font-semibold text-surface-100">Usage Example</h3>
        <div className="rounded-lg bg-surface-800 p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-surface-300">
            <span className="text-purple-400">curl</span> -X GET \{'\n'}
            {'  '}-H <span className="text-emerald-400">"Authorization: Bearer YOUR_API_KEY"</span>{' '}
            \{'\n'}
            {'  '}
            <span className="text-accent-400">https://api.foiastream.com/v1/requests</span>
          </pre>
        </div>
      </div>

      {showConfirm && (
        <ConfirmPasswordModal
          title={apiKey ? 'Regenerate API Key' : 'Generate API Key'}
          description={
            apiKey
              ? 'This will invalidate your current API key. Enter your password to confirm.'
              : 'Enter your password to generate a new API key.'
          }
          confirmLabel={apiKey ? 'Regenerate' : 'Generate'}
          onConfirm={handleCreateKey}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

function DangerZoneTab() {
  const [showDeleteData, setShowDeleteData] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-semibold text-surface-100">Danger Zone</h2>
        </div>
        <p className="text-sm text-surface-400 mb-6">
          These actions are permanent and cannot be undone. Please proceed with caution.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border border-surface-700 bg-surface-900/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-surface-100">Delete All Data</h3>
                <p className="mt-1 text-sm text-surface-400">
                  Permanently delete all your FOIA requests, templates, and associated data. Your
                  account will remain active.
                </p>
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                  <strong>Warning:</strong> This will delete all your requests, documents, and saved
                  templates. This action cannot be undone.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteData(true)}
                className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                Delete Data
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-surface-100">Delete Account</h3>
                <p className="mt-1 text-sm text-surface-400">
                  Permanently delete your account and all associated data. You will be logged out
                  immediately.
                </p>
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                  <strong>Warning:</strong> This will permanently delete your account, all requests,
                  documents, API keys, and any other data. This action cannot be undone.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAccount(true)}
                className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteData && (
        <DeleteConfirmationModal type="data" onClose={() => setShowDeleteData(false)} />
      )}

      {showDeleteAccount && (
        <DeleteConfirmationModal type="account" onClose={() => setShowDeleteAccount(false)} />
      )}
    </div>
  );
}

function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    const response = await api.changePassword(currentPassword, newPassword);

    if (response.success) {
      setSuccess(true);
      setTimeout(() => {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }, 2000);
    } else {
      setError(response.error || 'Failed to change password');
    }
    setIsLoading(false);
  };

  const inputClass =
    'block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-surface-100">Change Password</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-400 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-surface-100">Password changed successfully!</p>
            <p className="mt-2 text-sm text-surface-400">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-surface-500">Minimum 8 characters</p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Change Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TwoFactorModal({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const [step, setStep] = useState<
    'confirm' | 'setup' | 'verify' | 'manage' | 'disable' | 'newBackupCodes'
  >('confirm');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [setupData, setSetupData] = useState<{
    qrCodeUrl: string;
    secret: string;
    backupCodes: readonly string[];
  } | null>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordConfirm = async () => {
    setIsLoading(true);
    setError('');

    if (enabled) {
      setStep('manage');
      setIsLoading(false);
    } else {
      const response = await api.setupMFA(password);
      if (response.success && response.data) {
        setSetupData(response.data);
        setStep('setup');
      } else {
        setError(response.error || 'Failed to setup 2FA');
      }
      setIsLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setIsLoading(true);
    setError('');

    const response = await api.regenerateBackupCodes(password, code);
    if (response.success && response.data) {
      setNewBackupCodes(response.data.backupCodes);
      setStep('newBackupCodes');
    } else {
      setError(response.error || 'Failed to regenerate backup codes');
    }
    setIsLoading(false);
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError('');

    const response = await api.verifyMFA(code);
    if (response.success) {
      onClose();
    } else {
      setError(response.error || 'Invalid code');
    }
    setIsLoading(false);
  };

  const handleDisable = async () => {
    setIsLoading(true);
    setError('');

    const response = await api.disableMFA(password, code);
    if (response.success) {
      onClose();
    } else {
      setError(response.error || 'Failed to disable 2FA');
    }
    setIsLoading(false);
  };

  const inputClass =
    'block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-surface-100">
            {enabled ? 'Manage Two-Factor Auth' : 'Enable Two-Factor Auth'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-400 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              {enabled
                ? 'Enter your password to manage 2FA settings.'
                : 'Enter your password to set up two-factor authentication.'}
            </p>
            <div>
              <label
                htmlFor="mfa-password"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="mfa-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordConfirm}
                disabled={isLoading || !password}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center rounded-lg bg-white p-4">
              <img
                src={
                  setupData.qrCodeUrl.startsWith('data:')
                    ? setupData.qrCodeUrl
                    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrCodeUrl)}`
                }
                alt="2FA QR Code"
                className="h-48 w-48"
              />
            </div>
            <div className="rounded-lg border border-surface-700 bg-surface-800 p-3">
              <p className="mb-1 text-xs text-surface-500">Or enter this code manually:</p>
              <code className="font-mono text-sm text-accent-400 break-all">
                {setupData.secret}
              </code>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="mb-2 text-xs font-medium text-amber-400">Backup Codes (save these!):</p>
              <div className="grid grid-cols-2 gap-1 font-mono text-xs text-surface-300">
                {setupData.backupCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep('verify')}
              className="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
            >
              I've Saved the Backup Codes
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Enter the 6-digit code from your authenticator app to verify setup.
            </p>
            <div>
              <label
                htmlFor="mfa-verification-code"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Verification Code
              </label>
              <input
                id="mfa-verification-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputClass} font-mono text-center text-2xl tracking-widest`}
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('setup')}
                className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isLoading || code.length !== 6}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Enable
              </button>
            </div>
          </div>
        )}

        {step === 'manage' && (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Your two-factor authentication is enabled. What would you like to do?
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleRegenerateBackupCodes}
                disabled={isLoading}
                className="flex w-full items-center gap-3 rounded-lg border border-surface-700 bg-surface-800 p-4 text-left transition-colors hover:border-surface-600 hover:bg-surface-700 disabled:opacity-50"
              >
                <div className="rounded-lg bg-accent-500/10 p-2">
                  <Key className="h-5 w-5 text-accent-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-surface-200">Regenerate Backup Codes</p>
                  <p className="text-xs text-surface-400">
                    Get new backup codes (invalidates old ones)
                  </p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-surface-400" />}
              </button>

              <button
                type="button"
                onClick={() => setStep('disable')}
                className="flex w-full items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-left transition-colors hover:bg-red-500/10"
              >
                <div className="rounded-lg bg-red-500/10 p-2">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-400">Disable 2FA</p>
                  <p className="text-xs text-surface-400">Remove two-factor authentication</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
            >
              Done
            </button>
          </div>
        )}

        {step === 'newBackupCodes' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <strong>Success!</strong> Your backup codes have been regenerated. Save them somewhere
              safe.
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="mb-3 text-xs font-medium text-amber-400">Your new backup codes:</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {newBackupCodes.map((code) => (
                  <span
                    key={code}
                    className="rounded bg-surface-800 px-2 py-1 text-center text-surface-200"
                  >
                    {code}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-amber-300">
                ⚠️ Your previous backup codes are now invalid.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newBackupCodes.join('\n'));
              }}
              className="w-full rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
            >
              Copy All Codes
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
            >
              I've Saved My Codes
            </button>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              <strong>Warning:</strong> Disabling 2FA will make your account less secure.
            </div>
            <div>
              <label
                htmlFor="mfa-disable-code"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Enter 2FA Code to Disable
              </label>
              <input
                id="mfa-disable-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputClass} font-mono text-center text-2xl tracking-widest`}
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('manage')}
                className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDisable}
                disabled={isLoading || code.length !== 6}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionsModal({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      deviceName: string | null;
      ipAddress: string | null;
      lastActiveAt: string | null;
      createdAt: string;
      isCurrent: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const response = await api.getSessions();
    if (response.success && response.data) {
      setSessions(response.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    const response = await api.revokeSession(sessionId);
    if (response.success) {
      setSessions(sessions.filter((s) => s.id !== sessionId));
    }
    setRevoking(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-surface-800 bg-surface-900 p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-surface-100">Active Sessions</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-400 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-surface-400 py-8">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`rounded-lg border p-4 ${
                  session.isCurrent
                    ? 'border-accent-500/30 bg-accent-500/5'
                    : 'border-surface-700 bg-surface-800/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-surface-400" />
                      <span className="font-medium text-surface-100">
                        {session.deviceName || 'Unknown Device'}
                      </span>
                      {session.isCurrent && (
                        <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs font-medium text-accent-400">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-surface-500">
                      {session.ipAddress || 'Unknown IP'}
                    </p>
                    <p className="text-xs text-surface-500">
                      Created {new Date(session.createdAt).toLocaleDateString()}
                      {session.lastActiveAt &&
                        ` • Active ${new Date(session.lastActiveAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revoking === session.id}
                      className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {revoking === session.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmPasswordModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (password: string, twoFactorCode?: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(true);

  useEffect(() => {
    const checkMfa = async () => {
      const response = await api.getMFAStatus();
      if (response.success && response.data) {
        setMfaEnabled(response.data.enabled);
      }
      setCheckingMfa(false);
    };
    checkMfa();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm(password, mfaEnabled ? twoFactorCode : undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
    setLoading(false);
  };

  const inputClass =
    'block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-surface-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-surface-400 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-surface-400">{description}</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {checkingMfa ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="api-key-password"
                className="mb-2 block text-sm font-medium text-surface-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="api-key-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {mfaEnabled && (
              <div>
                <label
                  htmlFor="api-key-2fa-code"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  2FA Code
                </label>
                <input
                  id="api-key-2fa-code"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} font-mono text-center text-xl tracking-widest`}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading || checkingMfa || !password || (mfaEnabled && twoFactorCode.length !== 6)
            }
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({
  type,
  onClose,
}: {
  type: 'data' | 'account';
  onClose: () => void;
}) {
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    const checkMfa = async () => {
      const response = await api.getMFAStatus();
      if (response.success && response.data) {
        setMfaEnabled(response.data.enabled);
      }
    };
    checkMfa();
  }, []);

  const isAccount = type === 'account';
  const confirmPhrase = isAccount ? 'delete my account' : 'delete my data';

  const handleDelete = async () => {
    if (confirmText !== confirmPhrase) {
      setError(`Please type "${confirmPhrase}" to confirm`);
      return;
    }

    setIsLoading(true);
    setError('');

    const response = isAccount
      ? await api.deleteAccount(password, mfaEnabled ? twoFactorCode : undefined)
      : await api.deleteUserData(password, mfaEnabled ? twoFactorCode : undefined);

    if (response.success) {
      if (isAccount) {
        localStorage.removeItem('auth_token');
        window.location.href = '/';
      } else {
        onClose();
        window.location.reload();
      }
    } else {
      setError(response.error || 'Failed to complete deletion');
    }
    setIsLoading(false);
  };

  const inputClass =
    'block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900 p-6 shadow-xl">
        {step === 'warning' && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className={`rounded-xl p-3 ${isAccount ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                {isAccount ? (
                  <Trash2 className="h-6 w-6 text-red-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-surface-100">
                {isAccount ? 'Delete Account' : 'Delete All Data'}
              </h3>
            </div>

            <div
              className={`mb-6 rounded-lg border p-4 ${
                isAccount
                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              <p className="font-medium mb-2">This action is permanent!</p>
              <ul className="space-y-1 text-sm">
                {isAccount ? (
                  <>
                    <li>• Your account will be permanently deleted</li>
                    <li>• All FOIA requests and documents will be deleted</li>
                    <li>• All templates and saved data will be deleted</li>
                    <li>• Your API keys will be revoked</li>
                    <li>• You will be logged out immediately</li>
                  </>
                ) : (
                  <>
                    <li>• All FOIA requests will be deleted</li>
                    <li>• All documents and attachments will be deleted</li>
                    <li>• All templates will be deleted</li>
                    <li>• Your account will remain active</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isAccount
                    ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                I Understand, Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-surface-100">Confirm Deletion</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-surface-400 hover:text-surface-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="delete-password"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="delete-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {mfaEnabled && (
                <div>
                  <label
                    htmlFor="delete-2fa-code"
                    className="mb-2 block text-sm font-medium text-surface-300"
                  >
                    2FA Code
                  </label>
                  <input
                    id="delete-2fa-code"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) =>
                      setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    className={`${inputClass} font-mono text-center text-xl tracking-widest`}
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="delete-confirm-text"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Type{' '}
                  <span className={isAccount ? 'text-red-400' : 'text-amber-400'}>
                    "{confirmPhrase}"
                  </span>{' '}
                  to confirm
                </label>
                <input
                  id="delete-confirm-text"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={inputClass}
                  placeholder={confirmPhrase}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('warning')}
                  className="rounded-lg border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    isLoading ||
                    !password ||
                    confirmText !== confirmPhrase ||
                    (mfaEnabled && twoFactorCode.length !== 6)
                  }
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isAccount
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-amber-600 text-white hover:bg-amber-500'
                  }`}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isAccount ? 'Delete Account Forever' : 'Delete All Data'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
