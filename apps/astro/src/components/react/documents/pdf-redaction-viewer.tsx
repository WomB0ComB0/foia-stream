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
 * @file PDF Redaction Viewer Component
 * @module components/react/pdf-redaction-viewer
 * @author FOIA Stream Team
 * @description Interactive PDF viewer with redaction capabilities. Allows users to
 *              select areas to redact, preview redactions, and apply permanent redactions.
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  Loader2,
  MousePointer2,
  Plus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { API_BASE } from '../../../lib/config';

// ============================================
// Types
// ============================================

/**
 * Represents a rectangular area to be redacted
 */
interface RedactionArea {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  reason?: string;
}

/**
 * Component props
 */
interface Props {
  /** The PDF file to display and redact */
  file: File | Blob;
  /** Original filename for downloads */
  filename?: string;
  /** Callback when viewer is closed */
  onClose?: () => void;
  /** Callback with the redacted PDF blob */
  onRedacted?: (redactedBlob: Blob, areas: RedactionArea[]) => void;
  /** Authentication token for API calls */
  authToken?: string;
}

/**
 * PDF page info from the API
 */
interface PageInfo {
  width: number;
  height: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a unique ID for redaction areas
 */
function generateId(): string {
  return `redact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// Component
// ============================================

/**
 * Interactive PDF viewer with redaction capabilities
 *
 * @component
 * @param {Props} props - Component props
 * @returns {React.JSX.Element} PDF redaction viewer
 *
 * @example
 * ```tsx
 * <PDFRedactionViewer
 *   file={pdfFile}
 *   filename="document.pdf"
 *   onRedacted={(blob, areas) => savePdf(blob)}
 *   authToken={token}
 * />
 * ```
 */
export default function PDFRedactionViewer({
  file,
  filename = 'document.pdf',
  onClose,
  onRedacted,
  authToken,
}: Props) {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [redactionAreas, setRedactionAreas] = useState<RedactionArea[]>([]);
  const [currentDraw, setCurrentDraw] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reasonInput, setReasonInput] = useState('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Keep ref in sync with state
  previewUrlRef.current = previewUrl;

  // ============================================
  // Effects
  // ============================================

  // Create object URL for PDF
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    // Load PDF info
    const loadInfo = async () => {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/redaction/info`, {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to load PDF info');
        }

        const result = await response.json();
        if (result.success && result.data) {
          setPageInfo(result.data.pages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadInfo();

    return () => {
      URL.revokeObjectURL(url);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [file, authToken]);

  // ============================================
  // API Functions
  // ============================================

  /**
   * Generate a preview of the redactions
   */
  async function generatePreview() {
    if (redactionAreas.length === 0) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('data', JSON.stringify({ areas: redactionAreas }));

      const response = await fetch(`${API_BASE}/redaction/preview`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const blob = await response.blob();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(blob));
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Apply redactions permanently and get the redacted PDF
   */
  async function applyRedactions() {
    if (redactionAreas.length === 0) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'data',
        JSON.stringify({
          areas: redactionAreas,
          options: {
            addRedactionLabel: true,
            labelText: 'REDACTED',
          },
        }),
      );

      const response = await fetch(`${API_BASE}/redaction/apply`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to apply redactions');
      }

      const blob = await response.blob();

      if (onRedacted) {
        onRedacted(blob, redactionAreas);
      }

      // Download the redacted file
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename.replace('.pdf', '-redacted.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redaction failed');
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // Drawing Handlers
  // ============================================

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!drawMode || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (zoom / 100);
      const y = (e.clientY - rect.top) / (zoom / 100);

      setIsDrawing(true);
      setCurrentDraw({ startX: x, startY: y, endX: x, endY: y });
      setSelectedArea(null);
    },
    [drawMode, zoom],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !currentDraw || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (zoom / 100);
      const y = (e.clientY - rect.top) / (zoom / 100);

      setCurrentDraw((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
    },
    [isDrawing, currentDraw, zoom],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentDraw) return;

    const width = Math.abs(currentDraw.endX - currentDraw.startX);
    const height = Math.abs(currentDraw.endY - currentDraw.startY);

    // Only create area if it's big enough
    if (width > 10 && height > 10) {
      const newArea: RedactionArea = {
        id: generateId(),
        page: currentPage,
        x: Math.min(currentDraw.startX, currentDraw.endX),
        y: Math.min(currentDraw.startY, currentDraw.endY),
        width,
        height,
      };
      setRedactionAreas((prev) => [...prev, newArea]);
      setSelectedArea(newArea.id);
    }

    setIsDrawing(false);
    setCurrentDraw(null);
  }, [isDrawing, currentDraw, currentPage]);

  // ============================================
  // Area Management
  // ============================================

  const deleteArea = useCallback((id: string) => {
    setRedactionAreas((prev) => prev.filter((area) => area.id !== id));
    setSelectedArea(null);
  }, []);

  const updateAreaReason = useCallback((id: string, reason: string) => {
    setRedactionAreas((prev) => prev.map((area) => (area.id === id ? { ...area, reason } : area)));
  }, []);

  const clearAllAreas = useCallback(() => {
    setRedactionAreas([]);
    setSelectedArea(null);
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // ============================================
  // Render Helpers
  // ============================================

  const currentPageAreas = redactionAreas.filter((area) => area.page === currentPage);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-surface-100">Redaction Editor</h3>
          <span className="rounded-full bg-surface-800 px-2 py-0.5 text-xs text-surface-400">
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 25, 25))}
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            title="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="min-w-16 text-center text-sm text-surface-400">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 25, 200))}
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            title="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>

          <div className="mx-2 h-6 w-px bg-surface-700" />

          {/* Close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex w-64 flex-col border-r border-surface-800 bg-surface-900">
          {/* Tools */}
          <div className="border-b border-surface-800 p-4">
            <h4 className="mb-3 text-sm font-medium text-surface-300">Tools</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDrawMode(false)}
                className={`flex-1 rounded-lg p-2 text-sm transition-colors ${
                  !drawMode
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                }`}
                title="Select mode"
              >
                <MousePointer2 className="mx-auto h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setDrawMode(true)}
                className={`flex-1 rounded-lg p-2 text-sm transition-colors ${
                  drawMode
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                }`}
                title="Draw redaction area"
              >
                <Plus className="mx-auto h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Redaction list */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-surface-300">
                Redactions ({redactionAreas.length})
              </h4>
              {redactionAreas.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllAreas}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {redactionAreas.length === 0 ? (
              <p className="text-sm text-surface-500">
                Click the + button and drag on the PDF to mark areas for redaction.
              </p>
            ) : (
              <div className="space-y-2">
                {redactionAreas.map((area, index) => (
                  <button
                    type="button"
                    key={area.id}
                    className={`w-full rounded-lg border p-2 text-left transition-colors ${
                      selectedArea === area.id
                        ? 'border-accent-500 bg-accent-500/10'
                        : 'border-surface-700 bg-surface-800 hover:border-surface-600'
                    }`}
                    onClick={() => {
                      setSelectedArea(area.id);
                      setCurrentPage(area.page);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-200">Area {index + 1}</span>
                      {/* biome-ignore lint/a11y/useSemanticElements: nested interactive element */}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteArea(area.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            deleteArea(area.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="text-surface-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="text-xs text-surface-500">
                      Page {area.page + 1} • {Math.round(area.width)}×{Math.round(area.height)}
                    </p>
                    {area.reason && <p className="mt-1 text-xs text-surface-400">{area.reason}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected area details */}
          {selectedArea && (
            <div className="border-t border-surface-800 p-4">
              <h4 className="mb-2 text-sm font-medium text-surface-300">Reason (optional)</h4>
              <input
                type="text"
                value={redactionAreas.find((a) => a.id === selectedArea)?.reason || reasonInput}
                onChange={(e) => {
                  setReasonInput(e.target.value);
                  updateAreaReason(selectedArea, e.target.value);
                }}
                placeholder="e.g., SSN, Personal Address"
                className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-surface-800 p-4 space-y-2">
            <button
              type="button"
              onClick={generatePreview}
              disabled={redactionAreas.length === 0 || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-700 px-4 py-2 text-sm font-medium text-surface-100 transition-colors hover:bg-surface-600 disabled:opacity-50"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>

            <button
              type="button"
              onClick={applyRedactions}
              disabled={redactionAreas.length === 0 || saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-colors hover:bg-accent-400 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Apply & Download
            </button>
          </div>

          {/* Warning */}
          <div className="border-t border-surface-800 p-4">
            <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs">
                Redactions are permanent and cannot be undone. Always save a copy of the original.
              </p>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="relative flex-1 overflow-auto bg-surface-950 p-8">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-950/80">
              <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
                <p className="text-surface-300">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="mt-4 text-sm text-accent-400 hover:text-accent-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {pdfUrl && (
            <div
              ref={containerRef}
              className={`relative mx-auto ${drawMode ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              role="application"
              aria-label="PDF redaction canvas"
            >
              {/* PDF iframe or preview */}
              <iframe
                src={`${showPreview && previewUrl ? previewUrl : pdfUrl}#view=FitH&page=${currentPage + 1}`}
                title="PDF Document"
                className="rounded-lg bg-white pointer-events-none"
                style={{
                  width: pageInfo[currentPage]?.width
                    ? `${pageInfo[currentPage].width}px`
                    : '816px',
                  height: pageInfo[currentPage]?.height
                    ? `${pageInfo[currentPage].height}px`
                    : '1056px',
                }}
              />

              {/* Redaction overlays */}
              {!showPreview &&
                currentPageAreas.map((area) => (
                  <button
                    type="button"
                    key={area.id}
                    className={`absolute border-2 transition-colors ${
                      selectedArea === area.id
                        ? 'border-accent-400 bg-accent-400/30'
                        : 'border-red-500 bg-red-500/30'
                    }`}
                    style={{
                      left: area.x,
                      top: area.y,
                      width: area.width,
                      height: area.height,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedArea(area.id);
                    }}
                    aria-label={`Redaction area ${area.reason || 'unnamed'}`}
                  />
                ))}

              {/* Current drawing */}
              {currentDraw && (
                <div
                  className="absolute border-2 border-dashed border-accent-400 bg-accent-400/20"
                  style={{
                    left: Math.min(currentDraw.startX, currentDraw.endX),
                    top: Math.min(currentDraw.startY, currentDraw.endY),
                    width: Math.abs(currentDraw.endX - currentDraw.startX),
                    height: Math.abs(currentDraw.endY - currentDraw.startY),
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Page navigation */}
      {pageInfo.length > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-surface-800 py-3">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
            className="rounded-lg px-3 py-1 text-sm text-surface-400 hover:bg-surface-800 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-surface-300">
            Page {currentPage + 1} of {pageInfo.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, pageInfo.length - 1))}
            disabled={currentPage === pageInfo.length - 1}
            className="rounded-lg px-3 py-1 text-sm text-surface-400 hover:bg-surface-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Button to open the redaction viewer for a file
 *
 * @component
 * @param {Object} props - Component props
 * @param {File | Blob | null} props.file - The PDF file
 * @param {string} [props.filename] - Display filename
 * @param {string} [props.authToken] - Auth token for API
 * @param {(blob: Blob) => void} [props.onRedacted] - Callback with redacted PDF
 * @returns {React.JSX.Element | null} Button or null if no file
 */
export function RedactionButton({
  file,
  filename,
  authToken,
  onRedacted,
}: {
  file: File | Blob | null;
  filename?: string;
  authToken?: string;
  onRedacted?: (blob: Blob) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!file) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-surface-700 px-3 py-2 text-sm font-medium text-surface-100 transition-colors hover:bg-surface-600"
      >
        <EyeOff className="h-4 w-4" />
        Redact
      </button>

      {isOpen && (
        <PDFRedactionViewer
          file={file}
          filename={filename}
          authToken={authToken}
          onClose={() => setIsOpen(false)}
          onRedacted={(blob) => {
            onRedacted?.(blob);
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}
