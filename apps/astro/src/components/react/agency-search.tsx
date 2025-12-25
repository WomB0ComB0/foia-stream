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
 * @file Searchable agency selection component with wildcard support
 * @module components/react/AgencySearch
 */

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Agency } from '@/lib/api';

/**
 * Props for the AgencySearch component
 * @interface AgencySearchProps
 */
interface AgencySearchProps {
  agencies: Agency[];
  selectedAgency: Agency | null;
  onSelect: (agency: Agency | null) => void;
  loading?: boolean;
  placeholder?: string;
}

/**
 * Converts a wildcard pattern to a regex
 * @param {string} pattern - Pattern with * and ? wildcards
 * @returns {RegExp} Compiled regular expression
 */
function patternToRegex(pattern: string): RegExp {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  escaped = escaped.replace(/\*/g, '.*');
  escaped = escaped.replace(/\?/g, '.');

  if (!pattern.includes('*') && !pattern.includes('?')) {
    escaped = `.*${escaped}.*`;
  }

  return new RegExp(escaped, 'i');
}

/**
 * Highlights matched portions of text
 * @param {string} text - Text to highlight
 * @param {string} pattern - Search pattern
 * @returns {React.ReactNode} Text with highlighted matches
 */
function highlightMatch(text: string, pattern: string): React.ReactNode {
  if (!pattern.trim()) return text;

  const searchTerms = pattern.replace(/[*?]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return text;

  const regex = new RegExp(
    `(${searchTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = searchTerms.some((term) => part.toLowerCase() === term.toLowerCase());
        const key = `${part}-${i}`;
        return isMatch ? (
          <mark key={key} className="bg-accent-500/30 text-accent-300 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={key}>{part}</span>
        );
      })}
    </>
  );
}

/** Labels for jurisdiction levels */
const JURISDICTION_LABELS: Record<string, string> = {
  federal: 'Federal',
  state: 'State',
  local: 'Local',
  county: 'County',
};

/** Color classes for jurisdiction badges */
const JURISDICTION_COLORS: Record<string, string> = {
  federal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  state: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  local: 'bg-green-500/20 text-green-400 border-green-500/30',
  county: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

/**
 * Searchable dropdown for selecting government agencies
 *
 * @component
 * @param {AgencySearchProps} props - Component props
 * @returns {React.JSX.Element} Agency search component
 *
 * @example
 * ```tsx
 * <AgencySearch
 *   agencies={agencies}
 *   selectedAgency={selected}
 *   onSelect={setSelected}
 *   placeholder="Search agencies..."
 * />
 * ```
 */
export default function AgencySearch({
  agencies,
  selectedAgency,
  onSelect,
  loading = false,
  placeholder = 'Search agencies... (use * for wildcards)',
}: AgencySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    federal: true,
    state: true,
    local: true,
    county: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const toggleSection = (jurisdiction: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [jurisdiction]: !prev[jurisdiction],
    }));
  };

  const expandAll = () => {
    setExpandedSections({ federal: true, state: true, local: true, county: true });
  };

  const collapseAll = () => {
    setExpandedSections({ federal: false, state: false, local: false, county: false });
  };

  const allExpanded = Object.values(expandedSections).every(Boolean);
  const allCollapsed = Object.values(expandedSections).every((v) => !v);

  const filteredAgencies = useMemo(() => {
    if (!searchQuery.trim()) return agencies;

    const terms = searchQuery
      .trim()
      .split(/\s+/)
      .filter((t) => !['', '*'].includes(t));
    if (terms.length === 0) return agencies;

    return agencies.filter((agency) => {
      const searchableText = [
        agency.name,
        agency.abbreviation,
        agency.state,
        agency.city,
        agency.county,
        agency.jurisdictionLevel,
      ]
        .filter(Boolean)
        .join(' ');

      return terms.every((term) => {
        const regex = patternToRegex(term);
        return regex.test(searchableText);
      });
    });
  }, [agencies, searchQuery]);

  const groupedAgencies = useMemo(() => {
    const groups: Record<string, Agency[]> = {
      federal: [],
      state: [],
      county: [],
      local: [],
    };

    for (const agency of filteredAgencies) {
      groups[agency.jurisdictionLevel]?.push(agency);
    }

    return groups;
  }, [filteredAgencies]);

  const flatList = useMemo(() => {
    return Object.entries(groupedAgencies)
      .filter(([jurisdiction, list]) => list.length > 0 && expandedSections[jurisdiction])
      .flatMap(([_, list]) => list);
  }, [groupedAgencies, expandedSections]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setFocusedIndex(0);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const focusedEl = listRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      focusedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[focusedIndex]) {
          handleSelect(flatList[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (agency: Agency) => {
    onSelect(agency);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {selectedAgency && !isOpen ? (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-left transition-colors hover:border-surface-600"
          >
            <Building2 className="h-5 w-5 shrink-0 text-accent-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-surface-100">
                {selectedAgency.name}
                {selectedAgency.abbreviation && (
                  <span className="ml-1 text-surface-400">({selectedAgency.abbreviation})</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-400">
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium border ${JURISDICTION_COLORS[selectedAgency.jurisdictionLevel]}`}
                >
                  {JURISDICTION_LABELS[selectedAgency.jurisdictionLevel]}
                </span>
                {selectedAgency.state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedAgency.state}
                    {selectedAgency.city && `, ${selectedAgency.city}`}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="rounded p-1 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
            >
              <X className="h-4 w-4" />
            </button>
          </button>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="block w-full rounded-lg border border-surface-700 bg-surface-800 py-3 pl-12 pr-10 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            {loading ? (
              <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-surface-500" />
            ) : (
              <ChevronDown
                className={`absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-surface-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agencies...
            </div>
          ) : filteredAgencies.length === 0 ? (
            <div className="py-8 text-center text-surface-400">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No agencies found</p>
              <p className="mt-1 text-sm text-surface-500">
                Try a different search term or use * as wildcard
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-surface-700 bg-surface-800/50 px-4 py-2">
                <span className="text-xs text-surface-400">
                  {filteredAgencies.length} agencies found
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={expandAll}
                    disabled={allExpanded}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-surface-400"
                    title="Expand all sections"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span>Expand</span>
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    disabled={allCollapsed}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-surface-400"
                    title="Collapse all sections"
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                    <span>Collapse</span>
                  </button>
                </div>
              </div>

              <div ref={listRef} className="overflow-y-auto max-h-64">
                {Object.entries(groupedAgencies).map(([jurisdiction, list]) => {
                  if (list.length === 0) return null;
                  const isExpanded = expandedSections[jurisdiction];

                  return (
                    <div key={jurisdiction}>
                      <button
                        type="button"
                        onClick={() => toggleSection(jurisdiction)}
                        className="sticky top-0 z-10 flex w-full items-center justify-between bg-surface-800/95 backdrop-blur-sm px-4 py-2.5 text-left border-b border-surface-700 transition-colors hover:bg-surface-700/50"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-surface-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-surface-500" />
                          )}
                          <span className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                            {JURISDICTION_LABELS[jurisdiction]}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${JURISDICTION_COLORS[jurisdiction]}`}
                          >
                            {list.length}
                          </span>
                        </div>
                        <span className="text-xs text-surface-500">
                          {isExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="bg-surface-900/50">
                          {list.map((agency) => {
                            const globalIndex = flatList.indexOf(agency);
                            const isFocused = globalIndex === focusedIndex;

                            return (
                              <button
                                key={agency.id}
                                type="button"
                                data-index={globalIndex}
                                onClick={() => handleSelect(agency)}
                                onMouseEnter={() => setFocusedIndex(globalIndex)}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                  isFocused ? 'bg-surface-800' : 'hover:bg-surface-800/50'
                                }`}
                              >
                                <Building2 className="h-5 w-5 shrink-0 text-surface-500" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-surface-100">
                                    {highlightMatch(agency.name, searchQuery)}
                                    {agency.abbreviation && (
                                      <span className="ml-1 text-surface-400">
                                        ({highlightMatch(agency.abbreviation, searchQuery)})
                                      </span>
                                    )}
                                  </div>
                                  {(agency.state || agency.city) && (
                                    <div className="flex items-center gap-1 text-sm text-surface-500">
                                      <MapPin className="h-3 w-3" />
                                      {highlightMatch(
                                        [agency.city, agency.state].filter(Boolean).join(', '),
                                        searchQuery,
                                      )}
                                    </div>
                                  )}
                                </div>
                                {agency.foiaPortalUrl && (
                                  <span className="shrink-0 text-xs text-accent-500">Portal</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {filteredAgencies.length > 0 && (
            <div className="border-t border-surface-700 bg-surface-800/50 px-4 py-2 text-xs text-surface-500">
              <span className="font-medium text-surface-400">Tips:</span>{' '}
              <code className="rounded bg-surface-700 px-1">FBI</code> exact match •{' '}
              <code className="rounded bg-surface-700 px-1">*police*</code> wildcard •{' '}
              <code className="rounded bg-surface-700 px-1">CA sheriff</code> combine terms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
