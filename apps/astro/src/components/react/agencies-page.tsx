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
 * @file Agencies browsing page component
 * @module components/react/AgenciesPage
 */

import {
  Building2,
  ChevronDown,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Search,
  Settings,
  Shield,
  Star,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Agency, api } from '@/lib/api';
import { initAuth, logout, useAuthStore } from '@/stores/auth';

const FAVORITES_KEY = 'foiastream_favorite_agencies';

/**
 * US States for filtering
 */
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington D.C.' },
];

/**
 * Agencies browsing page component
 */
export default function AgenciesPage() {
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAuth();
    // Load favorites from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(new Set(JSON.parse(stored)));
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    const response = await api.getAgencies({
      search: searchQuery || undefined,
      state: selectedState || undefined,
      jurisdictionLevel: selectedJurisdiction || undefined,
      limit: 50,
    });
    if (response.success && response.data) {
      setAgencies(response.data);
    }
    setLoading(false);
  }, [searchQuery, selectedState, selectedJurisdiction]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const clearFilters = () => {
    setSelectedState('');
    setSelectedJurisdiction('');
    setSearchQuery('');
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters = selectedState || selectedJurisdiction || showFavoritesOnly;

  const toggleFavorite = (agencyId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(agencyId)) {
        newFavorites.delete(agencyId);
      } else {
        newFavorites.add(agencyId);
      }
      // Persist to localStorage
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  const filteredAgencies = showFavoritesOnly
    ? agencies.filter((a) => favorites.has(a.id))
    : agencies;

  const getJurisdictionBadge = (level: string) => {
    const badges: Record<string, string> = {
      federal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      state: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      county: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      local: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return badges[level] || 'bg-surface-700 text-surface-300';
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-accent-400" />
              <span className="font-display text-lg font-semibold tracking-tight text-surface-100">
                FOIA<span className="text-accent-400">Stream</span>
              </span>
            </a>

            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="/dashboard"
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Dashboard
              </a>
              <a
                href="/agencies"
                className="flex items-center gap-1.5 text-sm font-medium text-accent-400"
              >
                <Building2 className="h-4 w-4" />
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
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Documents
              </a>
            </nav>

            {isAuth && user ? (
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
                    <div className="border-b border-surface-800 px-3 py-2 mb-1.5">
                      <p className="text-sm font-medium text-surface-200">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-surface-500 truncate">{user.email}</p>
                    </div>
                    <a
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                      <LayoutDashboard className="h-4 w-4 text-surface-500" />
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                      <Settings className="h-4 w-4 text-surface-500" />
                      Settings
                    </a>
                    <div className="my-1.5 border-t border-surface-800" />
                    <a
                      href="/terms"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-300"
                    >
                      <FileText className="h-4 w-4 text-surface-500" />
                      Terms of Service
                    </a>
                    <a
                      href="/privacy"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-300"
                    >
                      <Shield className="h-4 w-4 text-surface-500" />
                      Privacy Policy
                    </a>
                    <div className="my-1.5 border-t border-surface-800" />
                    <button
                      onClick={handleLogout}
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a
                  href="/login"
                  className="text-sm text-surface-300 transition-colors hover:text-surface-100"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-surface-100">Government Agencies</h1>
          <p className="text-surface-400">Search and browse agencies that accept FOIA requests</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search agencies by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-surface-700 bg-surface-800 py-3 pl-12 pr-4 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                showFavoritesOnly
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-surface-700 text-surface-300 hover:border-surface-600 hover:bg-surface-800'
              }`}
            >
              <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites
              {favorites.size > 0 && (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    showFavoritesOnly
                      ? 'bg-amber-500 text-surface-950'
                      : 'bg-surface-700 text-surface-300'
                  }`}
                >
                  {favorites.size}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                selectedState || selectedJurisdiction
                  ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                  : 'border-surface-700 text-surface-300 hover:border-surface-600 hover:bg-surface-800'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {(selectedState || selectedJurisdiction) && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-xs text-surface-950">
                  {(selectedState ? 1 : 0) + (selectedJurisdiction ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-surface-700 bg-surface-900/50 p-4">
              <div className="flex-1 min-w-50">
                <label
                  htmlFor="agency-state-filter"
                  className="mb-1 block text-xs font-medium text-surface-400"
                >
                  State
                </label>
                <select
                  id="agency-state-filter"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-500 focus:outline-none"
                >
                  <option value="">All States</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-50">
                <label
                  htmlFor="agency-jurisdiction-filter"
                  className="mb-1 block text-xs font-medium text-surface-400"
                >
                  Jurisdiction
                </label>
                <select
                  id="agency-jurisdiction-filter"
                  value={selectedJurisdiction}
                  onChange={(e) => setSelectedJurisdiction(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-500 focus:outline-none"
                >
                  <option value="">All Jurisdictions</option>
                  <option value="federal">Federal</option>
                  <option value="state">State</option>
                  <option value="county">County</option>
                  <option value="local">Local</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-surface-600" />
            <p className="mt-4 text-lg font-medium text-surface-300">No agencies found</p>
            <p className="mt-1 text-surface-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgencies.map((agency) => (
              <div
                key={agency.id}
                className="group relative rounded-xl border border-surface-800 bg-surface-900/50 p-5 transition-all hover:border-surface-700 hover:bg-surface-900"
              >
                {/* Favorite button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(agency.id);
                  }}
                  className={`absolute right-3 top-3 rounded-lg p-1.5 transition-all ${
                    favorites.has(agency.id)
                      ? 'text-amber-400 hover:bg-amber-500/20'
                      : 'text-surface-600 opacity-0 group-hover:opacity-100 hover:bg-surface-800 hover:text-amber-400'
                  }`}
                >
                  <Star className={`h-4 w-4 ${favorites.has(agency.id) ? 'fill-current' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAgency(agency)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-surface-100 group-hover:text-accent-400 transition-colors truncate">
                        {agency.name}
                      </h3>
                      {agency.abbreviation && (
                        <p className="text-sm text-surface-500">{agency.abbreviation}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getJurisdictionBadge(agency.jurisdictionLevel)}`}
                    >
                      {agency.jurisdictionLevel}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {agency.state && (
                      <div className="flex items-center gap-2 text-sm text-surface-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {US_STATES.find((s) => s.code === agency.state)?.name || agency.state}
                        </span>
                        {agency.city && <span>• {agency.city}</span>}
                      </div>
                    )}
                    {agency.foiaEmail && (
                      <div className="flex items-center gap-2 text-sm text-surface-400">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{agency.foiaEmail}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-surface-500">
                    <span>{agency.responseDeadlineDays} day response</span>
                    {agency.foiaPortalUrl && (
                      <span className="flex items-center gap-1 text-accent-400">
                        <Globe className="h-3 w-3" />
                        Online Portal
                      </span>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && filteredAgencies.length > 0 && (
          <p className="mt-6 text-center text-sm text-surface-500">
            Showing {filteredAgencies.length} {showFavoritesOnly ? 'favorite ' : ''}agencies
            {showFavoritesOnly &&
              filteredAgencies.length !== agencies.length &&
              ` (${agencies.length} total)`}
          </p>
        )}
      </main>

      {/* Agency Detail Modal */}
      {selectedAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-800 p-6">
              <div>
                <h2 className="text-xl font-semibold text-surface-100">{selectedAgency.name}</h2>
                {selectedAgency.abbreviation && (
                  <p className="text-surface-400">{selectedAgency.abbreviation}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgency(null)}
                className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${getJurisdictionBadge(selectedAgency.jurisdictionLevel)}`}
                >
                  {selectedAgency.jurisdictionLevel}
                </span>
                {selectedAgency.state && (
                  <span className="text-sm text-surface-400">
                    {US_STATES.find((s) => s.code === selectedAgency.state)?.name}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {selectedAgency.foiaEmail && (
                  <a
                    href={`mailto:${selectedAgency.foiaEmail}`}
                    className="flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-sm text-surface-300 transition-colors hover:bg-surface-800"
                  >
                    <Mail className="h-5 w-5 text-surface-500" />
                    <span>{selectedAgency.foiaEmail}</span>
                  </a>
                )}

                {selectedAgency.foiaPortalUrl && (
                  <a
                    href={selectedAgency.foiaPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-sm text-surface-300 transition-colors hover:bg-surface-800"
                  >
                    <Globe className="h-5 w-5 text-surface-500" />
                    <span className="flex-1 truncate">FOIA Portal</span>
                    <ExternalLink className="h-4 w-4 text-surface-500" />
                  </a>
                )}

                {selectedAgency.city && selectedAgency.state && (
                  <div className="flex items-start gap-3 rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-sm text-surface-300">
                    <MapPin className="h-5 w-5 text-surface-500 shrink-0 mt-0.5" />
                    <span>
                      {selectedAgency.city}, {selectedAgency.state}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-800">
                <div className="text-center">
                  <p className="text-2xl font-bold text-surface-100">
                    {selectedAgency.responseDeadlineDays}
                  </p>
                  <p className="text-xs text-surface-500">Day Response Deadline</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-surface-100">
                    {selectedAgency.appealDeadlineDays}
                  </p>
                  <p className="text-xs text-surface-500">Day Appeal Deadline</p>
                </div>
              </div>
            </div>

            <div className="border-t border-surface-800 p-4 space-y-3">
              <button
                type="button"
                onClick={() => toggleFavorite(selectedAgency.id)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  favorites.has(selectedAgency.id)
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'border-surface-600 text-surface-300 hover:border-surface-500 hover:bg-surface-800'
                }`}
              >
                <Star
                  className={`h-4 w-4 ${favorites.has(selectedAgency.id) ? 'fill-current' : ''}`}
                />
                {favorites.has(selectedAgency.id) ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>
              <a
                href={`/requests/new?agency=${selectedAgency.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400"
              >
                <FileText className="h-4 w-4" />
                Start FOIA Request
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
