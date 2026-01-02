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
 * @file Documents Page Component
 * @module components/react/documents-page
 * @author FOIA Stream Team
 * @description Document management page with upload, redaction, and download capabilities.
 *              Includes virus scanning status, MFA verification, and auto-redaction templates.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import { navigateTo } from '@/lib/navigation';
import { initAuth, logout, useAuthStore } from '@/stores/auth';
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Key,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Document,
  documentsApi,
  type RedactionTemplate,
} from '../../../lib/api/documents.api';
import PDFTextRedactor from './pdf-text-redactor';

// Types imported from documents.api.ts
// Document and RedactionTemplate types are now imported

interface UploadOptions {
  requiresMfa: boolean;
  accessPassword: string;
  expiresInDays: number | null;
}

// ============================================
// Helper Functions
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: Document['status']): string {
  switch (status) {
    case 'clean':
    case 'redacted':
      return 'text-green-400 bg-green-400/10';
    case 'infected':
      return 'text-red-400 bg-red-400/10';
    case 'pending_scan':
    case 'scanning':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'scan_failed':
      return 'text-orange-400 bg-orange-400/10';
    case 'archived':
      return 'text-surface-400 bg-surface-400/10';
    default:
      return 'text-surface-400 bg-surface-400/10';
  }
}

function getStatusIcon(status: Document['status']) {
  switch (status) {
    case 'clean':
    case 'redacted':
      return <ShieldCheck className="h-4 w-4" />;
    case 'infected':
      return <XCircle className="h-4 w-4" />;
    case 'pending_scan':
    case 'scanning':
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    case 'scan_failed':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
}

// ============================================
// Component
// ============================================

/**
 * Documents page with upload, management, and redaction features
 *
 * @component
 * @returns {React.JSX.Element} Documents management page
 */
export default function DocumentsPage() {
  // Auth state
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    requiresMfa: false,
    accessPassword: '',
    expiresInDays: null,
  });
  const [dragOver, setDragOver] = useState(false);

  // Viewer state
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documentBlob, setDocumentBlob] = useState<Blob | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);

  // MFA verification state
  const [mfaDocument, setMfaDocument] = useState<Document | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  // Password verification state
  const [passwordDocument, setPasswordDocument] = useState<Document | null>(null);
  const [documentPassword, setDocumentPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // Redaction templates state
  const [templates, setTemplates] = useState<RedactionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Text redaction state
  const [showTextRedactor, setShowTextRedactor] = useState(false);
  const [textToRedact, setTextToRedact] = useState('');
  const [redactedText, setRedactedText] = useState<string | null>(null);
  const [redacting, setRedacting] = useState(false);

  // ============================================
  // API Helpers
  // ============================================

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await documentsApi.getDocuments();

      if (result.success && result.data) {
        setDocuments(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch documents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const result = await documentsApi.getRedactionTemplates();

      if (result.success && result.data) {
        setTemplates(result.data.systemTemplates || []);
      }
    } catch {
      // Templates are optional
    }
  }, []);

  // ============================================
  // Effects
  // ============================================

  // Initialize auth
  useEffect(() => {
    initAuth();
  }, []);

  // Handle click outside for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuth) {
      navigateTo('/login');
    }
  }, [authLoading, isAuth]);

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, [fetchDocuments, fetchTemplates]);

  // ============================================
  // Handlers
  // ============================================

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      setUploading(true);
      setUploadProgress(0);

      try {
        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const result = await documentsApi.uploadDocument(file, {
          requiresMfa: uploadOptions.requiresMfa || undefined,
          accessPassword: uploadOptions.accessPassword || undefined,
          expiresInDays: uploadOptions.expiresInDays,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // Optimistically add the new document to the list
        if (result.data) {
          setDocuments((prev) => [result.data!, ...prev]);
        }

        // Reset form
        setShowUpload(false);
        setUploadOptions({ requiresMfa: false, accessPassword: '', expiresInDays: null });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [uploadOptions, fetchDocuments],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  const handleViewDocument = useCallback(async (doc: Document, accessToken?: string) => {
    // Check if MFA or password required
    if (doc.requiresMfa && !accessToken) {
      setMfaDocument(doc);
      return;
    }

    if (doc.hasPassword && !doc.requiresMfa && !accessToken) {
      setPasswordDocument(doc);
      return;
    }

    setLoadingDocument(true);
    try {
      const result = await documentsApi.downloadDocument(doc.id, accessToken);

      if (!result.success) {
        if (result.requiresMfa) {
          setMfaDocument(doc);
          return;
        }
        if (result.requiresPassword) {
          setPasswordDocument(doc);
          return;
        }
        throw new Error(result.error || 'Failed to load document');
      }

      if (result.blob) {
        setDocumentBlob(result.blob);
        setViewingDocument(doc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoadingDocument(false);
    }
  }, []);

  const handleVerifyMfa = useCallback(async () => {
    if (!mfaDocument || mfaCode.length !== 6) return;

    setVerifyingMfa(true);
    setMfaError(null);

    try {
      const result = await documentsApi.verifyMfa(mfaDocument.id, mfaCode);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'MFA verification failed');
      }

      // Use the access token to view the document
      const doc = mfaDocument;
      setMfaDocument(null);
      setMfaCode('');
      await handleViewDocument(doc, result.data.accessToken);
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifyingMfa(false);
    }
  }, [mfaDocument, mfaCode, handleViewDocument]);

  const handleVerifyPassword = useCallback(async () => {
    if (!passwordDocument || !documentPassword) return;

    setVerifyingPassword(true);
    setPasswordError(null);

    try {
      const result = await documentsApi.verifyPassword(passwordDocument.id, documentPassword);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Password verification failed');
      }

      const doc = passwordDocument;
      setPasswordDocument(null);
      setDocumentPassword('');
      await handleViewDocument(doc, result.data.accessToken);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifyingPassword(false);
    }
  }, [passwordDocument, documentPassword, handleViewDocument]);

  const handleDelete = useCallback(
    async (doc: Document) => {
      if (!confirm(`Are you sure you want to delete "${doc.originalFileName}"?`)) {
        return;
      }

      // Optimistically remove from UI immediately
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

      try {
        const result = await documentsApi.deleteDocument(doc.id);

        if (!result.success) {
          // Restore document if delete failed
          setDocuments((prev) => [...prev, doc]);
          throw new Error(result.error || 'Delete failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
        // Refetch to ensure consistency
        await fetchDocuments();
      }
    },
    [fetchDocuments],
  );

  const handleDownload = useCallback(async (doc: Document) => {
    // Check security requirements
    if (doc.requiresMfa) {
      setMfaDocument(doc);
      return;
    }

    if (doc.hasPassword) {
      setPasswordDocument(doc);
      return;
    }

    try {
      const result = await documentsApi.downloadDocument(doc.id);

      if (!result.success || !result.blob) {
        throw new Error(result.error || 'Download failed');
      }

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }, []);

  const handleTextRedaction = useCallback(async () => {
    if (!textToRedact.trim()) return;

    setRedacting(true);
    try {
      const result = await documentsApi.redactText(textToRedact, selectedTemplate || undefined);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Redaction failed');
      }

      setRedactedText(result.data.redacted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redaction failed');
    } finally {
      setRedacting(false);
    }
  }, [textToRedact, selectedTemplate]);

  // ============================================
  // Filtered Documents
  // ============================================

  const filteredDocuments = documents.filter((doc) =>
    doc.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ============================================
  // Render
  // ============================================

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuth || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-accent-400" />
              <span className="font-display text-lg font-semibold tracking-tight text-surface-100">
                FOIA<span className="text-accent-400">Stream</span>
              </span>
            </a>

            {/* Navigation */}
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="/dashboard"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Dashboard
              </a>
              <a
                href="/agencies"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Agencies
              </a>
              <a
                href="/templates"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Templates
              </a>
              <a
                href="/documents"
                className="flex items-center gap-1.5 text-sm font-medium text-accent-400"
              >
                <Shield className="h-4 w-4" />
                Documents
              </a>
            </nav>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                type="button"
                className="flex items-center gap-2 rounded-lg border border-surface-700 px-3 py-2 text-sm text-surface-200 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                <User className="h-4 w-4 text-surface-400" />
                <span className="hidden sm:inline">{user.firstName}</span>
                <ChevronDown
                  className={`h-4 w-4 text-surface-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-surface-700 bg-surface-900 p-1.5 shadow-xl shadow-black/20">
                  {/* User Info */}
                  <div className="border-b border-surface-800 px-3 py-2 mb-1.5">
                    <p className="text-sm font-medium text-surface-200">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-surface-500 truncate">{user.email}</p>
                  </div>

                  {/* Navigation Links */}
                  <a
                    href="/dashboard"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    <FileText className="h-4 w-4 text-surface-500" />
                    Dashboard
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    <Settings className="h-4 w-4 text-surface-500" />
                    Settings
                  </a>

                  {/* Divider */}
                  <div className="my-1.5 border-t border-surface-800" />

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-surface-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-surface-100">Documents</h1>
              <p className="mt-1 text-surface-400">
                Upload, scan, and redact sensitive documents securely
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTextRedactor(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2 text-sm font-medium text-surface-200 transition-colors hover:bg-surface-700"
              >
                <FileText className="h-4 w-4" />
                Text Redactor
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-colors hover:bg-accent-400"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
              <button type="button" onClick={() => setError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-900 py-2.5 pl-10 pr-4 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
            <div>
              <p className="font-medium text-accent-300">Secure Document Processing</p>
              <p className="mt-1 text-sm text-surface-400">
                All uploaded documents are scanned for malware using VirusTotal. Sensitive documents
                can be protected with MFA or password. Redactions are applied permanently and cannot
                be undone.
              </p>
            </div>
          </div>

          {/* Documents List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-700 bg-surface-900/50 px-8 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-surface-500" />
              <h3 className="mt-4 text-lg font-medium text-surface-200">No documents</h3>
              <p className="mt-2 text-surface-400">
                {searchQuery
                  ? 'No documents match your search'
                  : 'Upload your first document to get started'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-colors hover:bg-accent-400"
                >
                  <Plus className="h-4 w-4" />
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-surface-800 bg-surface-900">
              <table className="w-full">
                <thead className="border-b border-surface-800 bg-surface-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-400">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-400">
                      Security
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-400">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-400">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="transition-colors hover:bg-surface-800/30">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-surface-500" />
                          <div>
                            <p className="font-medium text-surface-100">{doc.originalFileName}</p>
                            <p className="text-xs text-surface-500">{doc.mimeType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(doc.status)}`}
                        >
                          {getStatusIcon(doc.status)}
                          {doc.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          {doc.requiresMfa && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/10 px-2 py-0.5 text-xs text-purple-400">
                              <Key className="h-3 w-3" />
                              MFA
                            </span>
                          )}
                          {doc.hasPassword && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/10 px-2 py-0.5 text-xs text-blue-400">
                              <Lock className="h-3 w-3" />
                              Password
                            </span>
                          )}
                          {!doc.requiresMfa && !doc.hasPassword && (
                            <span className="text-xs text-surface-500">None</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-surface-300">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-surface-300">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.mimeType === 'application/pdf' && doc.status === 'clean' && (
                            <button
                              type="button"
                              onClick={() => handleViewDocument(doc)}
                              disabled={loadingDocument}
                              className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                              title="View & Redact"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc)}
                            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload Modal */}
          {showUpload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-surface-100">Upload Document</h2>
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Drop Zone */}
                <section
                  // role="presentation"
                  aria-label="Drop zone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`mb-6 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    dragOver
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-surface-700 bg-surface-800/50'
                  }`}
                >
                  {uploading ? (
                    <div className="space-y-4">
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent-400" />
                      <div className="mx-auto max-w-xs">
                        <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-700">
                          <div
                            className="h-full bg-accent-500 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-surface-400">
                          {uploadProgress < 90 ? 'Uploading...' : 'Scanning for viruses...'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-surface-500" />
                      <p className="mt-4 text-surface-300">
                        Drag and drop a file here, or{' '}
                        <label className="cursor-pointer text-accent-400 hover:text-accent-300">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt"
                            onChange={(e) => handleUpload(e.target.files)}
                          />
                        </label>
                      </p>
                      <p className="mt-2 text-xs text-surface-500">
                        Supported: PDF, images, Office documents (max 100MB)
                      </p>
                    </>
                  )}
                </section>

                {/* Security Options */}
                <div className="space-y-4 border-t border-surface-800 pt-6">
                  <h3 className="text-sm font-medium text-surface-300">Security Options</h3>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={uploadOptions.requiresMfa}
                      onChange={(e) =>
                        setUploadOptions((prev) => ({ ...prev, requiresMfa: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
                    />
                    <span className="text-sm text-surface-300">Require MFA to access</span>
                  </label>

                  <div>
                    <label htmlFor="access-password" className="block text-sm text-surface-400">
                      Access Password (optional)
                    </label>
                    <input
                      type="password"
                      value={uploadOptions.accessPassword}
                      onChange={(e) =>
                        setUploadOptions((prev) => ({ ...prev, accessPassword: e.target.value }))
                      }
                      placeholder="Enter password"
                      className="mt-1 w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="expires-in-days" className="block text-sm text-surface-400">
                      Auto-expire after (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={uploadOptions.expiresInDays || ''}
                      onChange={(e) =>
                        setUploadOptions((prev) => ({
                          ...prev,
                          expiresInDays: e.target.value
                            ? Number.parseInt(e.target.value, 10)
                            : null,
                        }))
                      }
                      placeholder="No expiration"
                      className="mt-1 w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MFA Verification Modal */}
          {mfaDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-surface-100">
                    MFA Verification Required
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaDocument(null);
                      setMfaCode('');
                      setMfaError(null);
                    }}
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-6 text-surface-400">
                  Enter your 6-digit authentication code to access{' '}
                  <span className="font-medium text-surface-200">
                    {mfaDocument.originalFileName}
                  </span>
                </p>

                {mfaError && (
                  <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                    {mfaError}
                  </div>
                )}

                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="mb-6 w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-center font-mono text-2xl tracking-widest text-surface-100 placeholder-surface-600 focus:border-accent-500 focus:outline-none"
                  maxLength={6}
                />

                <button
                  type="button"
                  onClick={handleVerifyMfa}
                  disabled={mfaCode.length !== 6 || verifyingMfa}
                  className="w-full rounded-lg bg-accent-500 py-3 font-medium text-surface-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifyingMfa ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : (
                    'Verify & Access'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Password Verification Modal */}
          {passwordDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-surface-100">Password Required</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordDocument(null);
                      setDocumentPassword('');
                      setPasswordError(null);
                    }}
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-6 text-surface-400">
                  Enter the password to access{' '}
                  <span className="font-medium text-surface-200">
                    {passwordDocument.originalFileName}
                  </span>
                </p>

                {passwordError && (
                  <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                    {passwordError}
                  </div>
                )}

                <input
                  type="password"
                  value={documentPassword}
                  onChange={(e) => setDocumentPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mb-6 w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleVerifyPassword}
                  disabled={!documentPassword || verifyingPassword}
                  className="w-full rounded-lg bg-accent-500 py-3 font-medium text-surface-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifyingPassword ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : (
                    'Verify & Access'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Text Redactor Modal */}
          {showTextRedactor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-3xl rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-surface-100">Text Redactor</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTextRedactor(false);
                      setTextToRedact('');
                      setRedactedText(null);
                    }}
                    className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Template Selector */}
                <div className="mb-4">
                  <label htmlFor="template" className="block text-sm text-surface-400">
                    Redaction Template
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(e.target.value || null)}
                    className="mt-1 w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-500 focus:outline-none"
                  >
                    <option value="">Standard PII (SSN, Email, Phone)</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Disclaimer */}
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    ⚠️ Automated redaction may not be 100% accurate. Always review results manually
                    before use.
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Input */}
                  <div>
                    <label htmlFor="text-to-redact" className="mb-2 block text-sm text-surface-400">
                      Original Text
                    </label>
                    <textarea
                      value={textToRedact}
                      onChange={(e) => setTextToRedact(e.target.value)}
                      placeholder="Paste text containing sensitive information..."
                      rows={12}
                      className="w-full rounded-lg border border-surface-700 bg-surface-800 p-3 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
                    />
                  </div>

                  {/* Output */}
                  <div>
                    <label htmlFor="redacted-text" className="mb-2 block text-sm text-surface-400">
                      Redacted Text
                    </label>
                    <div className="h-[272px] overflow-auto rounded-lg border border-surface-700 bg-surface-800 p-3">
                      {redacting ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
                        </div>
                      ) : redactedText ? (
                        <pre className="whitespace-pre-wrap text-sm text-surface-100">
                          {redactedText}
                        </pre>
                      ) : (
                        <p className="text-sm text-surface-500">
                          Redacted text will appear here...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTextToRedact('');
                      setRedactedText(null);
                    }}
                    className="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleTextRedaction}
                    disabled={!textToRedact.trim() || redacting}
                    className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {redacting ? 'Redacting...' : 'Redact Text'}
                  </button>
                  {redactedText && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(redactedText)}
                      className="rounded-lg bg-surface-700 px-4 py-2 text-sm text-surface-200 transition-colors hover:bg-surface-600"
                    >
                      Copy Result
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PDF Text Redactor */}
          {viewingDocument && documentBlob && (
            <PDFTextRedactor
              file={documentBlob}
              filename={viewingDocument.originalFileName}
              onClose={() => {
                setViewingDocument(null);
                setDocumentBlob(null);
              }}
              onRedacted={(blob, _) => {
                // Download the redacted PDF
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `redacted_${viewingDocument.originalFileName}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              authToken={localStorage.getItem('auth_token') || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
