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
 * @file Lightweight document viewer component
 * @module components/react/DocumentViewer
 * @description Client-side document preview that doesn't require server resources
 */

import {
  Download,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useState } from 'react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  previewUrl?: string;
}

interface Props {
  document: Document;
  onClose?: () => void;
}

/**
 * Get file icon based on type
 */
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <FileImage className="h-6 w-6" />;
  if (type.includes('pdf')) return <FileText className="h-6 w-6" />;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return <FileSpreadsheet className="h-6 w-6" />;
  }
  return <File className="h-6 w-6" />;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Lightweight document viewer component
 * Supports images, PDFs (via browser), and provides download for other types
 */
export default function DocumentViewer({ document, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const isImage = document.type.startsWith('image/');
  const isPDF = document.type.includes('pdf');
  const canPreview = isImage || isPDF;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-800 bg-surface-950 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800 text-surface-400">
            {getFileIcon(document.type)}
          </div>
          <div>
            <h3 className="font-medium text-surface-100">{document.name}</h3>
            <p className="text-xs text-surface-500">
              {document.type} • {formatFileSize(document.size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canPreview && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200 disabled:opacity-50"
                title="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="min-w-16 text-center text-sm text-surface-400">{zoom}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200 disabled:opacity-50"
                title="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <div className="mx-2 h-6 w-px bg-surface-700" />
            </>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>

          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
            title="Open in new tab"
          >
            <ExternalLink className="h-5 w-5" />
          </a>

          <a
            href={document.url}
            download={document.name}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {canPreview ? (
          <div
            className={`flex min-h-full items-center justify-center p-8 ${
              isFullscreen ? '' : 'max-h-[calc(100vh-64px)]'
            }`}
          >
            {loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
              </div>
            )}

            {error ? (
              <div className="text-center">
                <File className="mx-auto mb-4 h-16 w-16 text-surface-600" />
                <p className="text-surface-300">Unable to preview this file</p>
                <a
                  href={document.url}
                  download={document.name}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              </div>
            ) : isImage ? (
              <img
                src={document.previewUrl || document.url}
                alt={document.name}
                style={{ transform: `scale(${zoom / 100})` }}
                className="max-h-full max-w-full object-contain transition-transform"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
              />
            ) : isPDF ? (
              <iframe
                src={`${document.url}#view=FitH`}
                title={document.name}
                className="h-full w-full rounded-lg bg-white"
                style={{
                  minHeight: '80vh',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-full items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-800 text-surface-400">
                {getFileIcon(document.type)}
              </div>
              <h3 className="mb-2 text-lg font-medium text-surface-100">Preview not available</h3>
              <p className="mb-6 text-surface-400">
                This file type cannot be previewed in the browser.
              </p>
              <a
                href={document.url}
                download={document.name}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
              >
                <Download className="h-5 w-5" />
                Download {formatFileSize(document.size)}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Document list item with preview capability
 */
export function DocumentListItem({
  document,
  onPreview,
}: {
  document: Document;
  onPreview: (doc: Document) => void;
}) {
  const isPreviewable = document.type.startsWith('image/') || document.type.includes('pdf');

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-800/50 p-3 transition-colors hover:bg-surface-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-700 text-surface-400">
        {getFileIcon(document.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-surface-100">{document.name}</p>
        <p className="text-xs text-surface-500">{formatFileSize(document.size)}</p>
      </div>
      <div className="flex items-center gap-1">
        {isPreviewable && (
          <button
            type="button"
            onClick={() => onPreview(document)}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
            title="Preview"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
        <a
          href={document.url}
          download={document.name}
          className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
