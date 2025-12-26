/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Privacy Mode toggle button component
 * @module components/react/privacy-toggle
 */

import { usePrivacyStore } from '@/stores/privacy';
import { Eye, EyeOff } from 'lucide-react';

interface PrivacyToggleProps {
  /** Optional additional CSS classes */
  className?: string;
  /** Show label text alongside icon */
  showLabel?: boolean;
}

/**
 * Toggle button for enabling/disabling Privacy Mode
 * When enabled, redacts sensitive information like SSN, email, phone numbers
 *
 * @component
 * @example
 * ```tsx
 * <PrivacyToggle />
 * <PrivacyToggle showLabel />
 * ```
 */
export default function PrivacyToggle({ className = '', showLabel = false }: PrivacyToggleProps) {
  const privacyMode = usePrivacyStore((s) => s.privacyMode);
  const togglePrivacy = usePrivacyStore((s) => s.togglePrivacy);

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      title={privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
      className={`
        group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
        ${
          privacyMode
            ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
            : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
        }
        ${className}
      `}
    >
      {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

      {showLabel && <span>{privacyMode ? 'Privacy On' : 'Privacy Off'}</span>}

      {/* Tooltip */}
      <span className="pointer-events-none absolute -bottom-10 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-800 px-2 py-1 text-xs text-surface-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {privacyMode ? 'Privacy Mode: ON' : 'Privacy Mode: OFF'}
      </span>
    </button>
  );
}

/**
 * Compact version of PrivacyToggle for tight spaces (icon only)
 */
export function PrivacyToggleCompact({ className = '' }: { className?: string }) {
  const privacyMode = usePrivacyStore((s) => s.privacyMode);
  const togglePrivacy = usePrivacyStore((s) => s.togglePrivacy);

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      title={privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
      className={`
        rounded-lg p-2 transition-colors
        ${
          privacyMode
            ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
            : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
        }
        ${className}
      `}
    >
      {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
