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
 * @file PDF Text Redactor Component
 * @module components/react/pdf-text-redactor
 * @author FOIA Stream Team
 * @description Advanced PDF redaction tool that allows users to select actual text
 *              in PDFs, highlight selections, and permanently redact with black bars.
 *              Uses PDF.js for rendering and text extraction.
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  FileText,
  Loader2,
  Trash2,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type * as PDFJS from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE } from '../../../lib/config';

// ============================================
// Types
// ============================================

interface TextSelection {
  id: string;
  pageNumber: number;
  text: string;
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  reason?: string;
}

interface PageDimensions {
  width: number;
  height: number;
  scale: number;
}

interface Props {
  /** The PDF file to redact */
  file: File | Blob;
  /** Original filename */
  filename?: string;
  /** Callback when closed */
  onClose?: () => void;
  /** Callback with redacted PDF */
  onRedacted?: (blob: Blob, selections: TextSelection[]) => void;
  /** Auth token for API calls */
  authToken?: string;
}

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `sel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Component
// ============================================

/**
 * PDF Text Redactor - Select and redact actual text from PDFs
 */
export default function PDFTextRedactor({
  file,
  filename = 'document.pdf',
  onClose,
  onRedacted,
  authToken,
}: Props) {
  // PDF.js library reference (loaded dynamically)
  const pdfjsRef = useRef<typeof PDFJS | null>(null);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<PDFJS.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);

  // UI state
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Selection state
  const [selections, setSelections] = useState<TextSelection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileDataRef = useRef<ArrayBuffer | null>(null);

  // ============================================
  // PDF Loading (with dynamic import)
  // ============================================

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamically import PDF.js
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsRef.current = pdfjsLib;

        // Set worker source from local public folder (copied from node_modules)
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();
        fileDataRef.current = arrayBuffer;

        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('PDF load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    return () => {
      pdfDoc?.destroy();
    };
  }, [file, pdfDoc?.destroy]);

  // ============================================
  // Page Rendering
  // ============================================

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !pdfjsRef.current) return;

    const pdfjsLib = pdfjsRef.current;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const scale = (zoom / 100) * 1.5; // Base scale for good quality
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setPageDimensions({
          width: viewport.width,
          height: viewport.height,
          scale,
        });

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise;

        // Render text layer for selection
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();

          for (const item of textContent.items) {
            if ('str' in item && item.str) {
              const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

              const span = document.createElement('span');
              span.textContent = item.str;
              span.style.position = 'absolute';
              span.style.left = `${tx[4]}px`;
              span.style.top = `${tx[5] - item.height * scale}px`;
              span.style.fontSize = `${item.height * scale}px`;
              span.style.fontFamily = 'sans-serif';
              span.style.color = 'transparent';
              span.style.whiteSpace = 'pre';
              span.style.pointerEvents = 'all';
              span.style.cursor = 'text';
              span.dataset.text = item.str;

              textLayerRef.current.appendChild(span);
            }
          }
        }
      } catch (err) {
        console.error('Render error:', err);
        setError('Failed to render page');
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, zoom]);

  // ============================================
  // Selection Handlers
  // ============================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setCurrentSelection({ x, y, width: 0, height: 0 });
    setSelectedId(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selectionStart || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCurrentSelection({
        x: Math.min(selectionStart.x, x),
        y: Math.min(selectionStart.y, y),
        width: Math.abs(x - selectionStart.x),
        height: Math.abs(y - selectionStart.y),
      });
    },
    [isSelecting, selectionStart],
  );
  const getTextInSelection = useCallback(
    (selection: { x: number; y: number; width: number; height: number }): string => {
      if (!textLayerRef.current) return '';

      const spans = textLayerRef.current.querySelectorAll('span');
      let text = '';

      for (const span of spans) {
        const rect = span.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        const spanX = rect.left - (containerRect?.left || 0);
        const spanY = rect.top - (containerRect?.top || 0);

        // Check if span overlaps with selection
        if (
          spanX < selection.x + selection.width &&
          spanX + rect.width > selection.x &&
          spanY < selection.y + selection.height &&
          spanY + rect.height > selection.y
        ) {
          text += `${span.dataset.text || ''} `;
        }
      }

      return text.trim();
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !currentSelection) {
      setIsSelecting(false);
      return;
    }

    // Only create selection if it's big enough
    if (currentSelection.width > 5 && currentSelection.height > 5) {
      // Get text within selection area
      const selectedText = getTextInSelection(currentSelection);

      const newSelection: TextSelection = {
        id: generateId(),
        pageNumber: currentPage,
        text: selectedText || '[Area selection]',
        rects: [
          {
            x: currentSelection.x,
            y: currentSelection.y,
            width: currentSelection.width,
            height: currentSelection.height,
          },
        ],
      };

      setSelections((prev) => [...prev, newSelection]);
      setSelectedId(newSelection.id);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  }, [isSelecting, currentSelection, currentPage, getTextInSelection]);

  // ============================================
  // Selection Management
  // ============================================

  const deleteSelection = useCallback(
    (id: string) => {
      setSelections((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const clearAllSelections = useCallback(() => {
    setSelections([]);
    setSelectedId(null);
  }, []);

  const updateSelectionReason = useCallback((id: string, reason: string) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, reason } : s)));
  }, []);

  // ============================================
  // Apply Redactions
  // ============================================

  const applyRedactions = useCallback(async () => {
    if (selections.length === 0 || !fileDataRef.current) return;

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Convert selections to redaction areas with page coordinates
      const scale = pageDimensions?.scale || 1.5;
      const areas = selections.flatMap((sel) =>
        sel.rects.map((rect) => ({
          page: sel.pageNumber - 1, // 0-indexed
          x: rect.x / scale,
          y: rect.y / scale,
          width: rect.width / scale,
          height: rect.height / scale,
          reason: sel.reason,
        })),
      );

      formData.append(
        'data',
        JSON.stringify({
          areas,
          options: {
            redactionColor: '#000000',
            addRedactionLabel: false,
            removeText: true,
          },
        }),
      );

      const response = await fetch(`${API_BASE}/redaction/apply`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Redaction failed');
      }

      const blob = await response.blob();

      if (onRedacted) {
        onRedacted(blob, selections);
      }

      // Auto-download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('.pdf', '-redacted.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Clear selections after successful redaction
      clearAllSelections();
    } catch (err) {
      console.error('Redaction error:', err);
      setError(err instanceof Error ? err.message : 'Redaction failed');
    } finally {
      setSaving(false);
    }
  }, [selections, file, pageDimensions, authToken, filename, onRedacted, clearAllSelections]);

  // ============================================
  // Current page selections
  // ============================================

  const currentPageSelections = selections.filter((s) => s.pageNumber === currentPage);

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent-400" />
          <p className="mt-4 text-surface-300">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-800 bg-surface-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-accent-400" />
          <h2 className="font-medium text-surface-100">Text Redactor</h2>
          <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-surface-400">
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-800 p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              className="rounded p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs text-surface-300">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
              className="rounded p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-800 p-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs text-surface-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-2 h-6 w-px bg-surface-700" />

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
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-72 flex-col border-r border-surface-800 bg-surface-900">
          {/* Instructions */}
          <div className="border-b border-surface-800 p-4">
            <div className="flex items-center gap-2 text-accent-400">
              <Type className="h-4 w-4" />
              <span className="text-sm font-medium">How to Redact</span>
            </div>
            <ol className="mt-2 space-y-1 text-xs text-surface-400">
              <li>1. Click and drag to select text areas</li>
              <li>2. Selected areas appear as highlights</li>
              <li>3. Add reasons (optional) for audit</li>
              <li>4. Click "Apply Redactions" to download</li>
            </ol>
          </div>

          {/* Selections list */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-surface-300">
                Selections ({selections.length})
              </h3>
              {selections.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllSelections}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Eraser className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>

            {selections.length === 0 ? (
              <p className="text-sm text-surface-500">
                No selections yet. Click and drag on the PDF to select text to redact.
              </p>
            ) : (
              <div className="space-y-2">
                {selections.map((sel, idx) => (
                  <div
                    key={sel.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      selectedId === sel.id
                        ? 'border-accent-500 bg-accent-500/10'
                        : 'border-surface-700 bg-surface-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-surface-700 px-1.5 py-0.5 text-xs text-surface-400">
                            P{sel.pageNumber}
                          </span>
                          <span className="text-xs text-surface-500">#{idx + 1}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-surface-200" title={sel.text}>
                          {sel.text.length > 30 ? `${sel.text.substring(0, 30)}...` : sel.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSelection(sel.id)}
                        className="shrink-0 rounded p-1 text-surface-500 hover:bg-surface-700 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Reason input */}
                    <input
                      type="text"
                      value={sel.reason || ''}
                      onChange={(e) => updateSelectionReason(sel.id, e.target.value)}
                      placeholder="Reason (e.g., SSN, PII)"
                      className="mt-2 w-full rounded border border-surface-700 bg-surface-900 px-2 py-1 text-xs text-surface-200 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-surface-800 p-4 space-y-3">
            <button
              type="button"
              onClick={applyRedactions}
              disabled={selections.length === 0 || saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Apply Redactions
            </button>

            {/* Warning */}
            <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400/90">
                Redactions are <strong>permanent</strong>. The text will be removed and replaced
                with black bars.
              </p>
            </div>
          </div>
        </aside>

        {/* PDF Viewer */}
        <main className="relative flex-1 overflow-auto bg-surface-950">
          {error && (
            <div className="absolute inset-x-0 top-4 z-10 mx-auto max-w-md">
              <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <p className="flex-1 text-sm text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex min-h-full items-start justify-center p-8">
            <div
              ref={containerRef}
              role="img"
              aria-label="PDF redaction area. Click and drag to select text regions for redaction."
              className="relative cursor-crosshair shadow-2xl"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* PDF Canvas */}
              <canvas ref={canvasRef} className="block rounded-lg bg-white" />

              {/* Text layer for selection detection */}
              <div
                ref={textLayerRef}
                className="absolute left-0 top-0 overflow-hidden"
                style={{ pointerEvents: 'none' }}
              />

              {/* Selection overlays for current page */}
              {currentPageSelections.map((sel) =>
                sel.rects.map((rect, idx) => (
                  <button
                    type="button"
                    key={`${sel.id}-${idx}`}
                    className={`absolute border-2 transition-colors cursor-pointer ${
                      selectedId === sel.id
                        ? 'border-accent-400 bg-accent-400/40'
                        : 'border-red-500 bg-red-500/40'
                    }`}
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(sel.id);
                    }}
                    aria-label={`Selection ${idx + 1}: ${sel.text.substring(0, 50)}`}
                  />
                )),
              )}

              {/* Current drawing selection */}
              {currentSelection && currentSelection.width > 0 && currentSelection.height > 0 && (
                <div
                  className="absolute border-2 border-dashed border-accent-400 bg-accent-400/30 pointer-events-none"
                  style={{
                    left: currentSelection.x,
                    top: currentSelection.y,
                    width: currentSelection.width,
                    height: currentSelection.height,
                  }}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
