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
 * @file Templates browsing page component
 * @module components/react/TemplatesPage
 */

import {
  AlertCircle,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ClipboardCopy,
  Copy,
  DollarSign,
  FileText,
  Gavel,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { initAuth, logout, useAuthStore } from '@/stores/auth';

const SAVED_TEMPLATES_KEY = 'foiastream_saved_templates';

/**
 * Template data structure
 */
interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  content: string;
  variables: string[];
  tips: string[];
}

/**
 * FOIA Request Templates
 */
const TEMPLATES: Template[] = [
  {
    id: 'police-bodycam',
    name: 'Police Body Camera Footage',
    category: 'Law Enforcement',
    description: 'Request body-worn camera recordings from police interactions',
    icon: <Camera className="h-6 w-6" />,
    iconBg: 'bg-red-500/20 text-red-400',
    variables: ['YOUR_NAME', 'DATE_OF_INCIDENT', 'LOCATION', 'OFFICER_NAMES', 'CASE_NUMBER'],
    tips: [
      'Include as many identifying details as possible',
      'Specify the exact date and time if known',
      'Note that some states have different retention periods',
    ],
    content: `Dear FOIA Officer:

Under the provisions of the Freedom of Information Act (5 U.S.C. § 552) and applicable state open records laws, I am requesting access to body-worn camera recordings from an incident that occurred on [DATE_OF_INCIDENT] at or near [LOCATION].

Specifically, I am seeking:

1. All body-worn camera footage from officers present at the scene, including but not limited to footage from [OFFICER_NAMES if known]
2. Any associated audio recordings
3. Any metadata associated with the recordings, including timestamps, GPS data, and officer identification
4. Related incident reports or case documentation bearing case number [CASE_NUMBER if applicable]

If the footage has been edited, redacted, or portions removed, please provide a log detailing what was removed and the legal basis for each redaction.

I am willing to pay reasonable duplication costs. If anticipated fees exceed $50, please notify me before proceeding. I request that responsive records be provided in their original digital format via secure electronic transfer where possible.

As these records relate to matters of significant public interest regarding police accountability and transparency, I request expedited processing and a fee waiver pursuant to applicable regulations.

Should any portion of this request be denied, please cite the specific exemption(s) justifying the withholding and provide information about your agency's appeal procedures.

I anticipate your response within the statutory timeframe. Please confirm receipt of this request.

Respectfully,
[YOUR_NAME]`,
  },
  {
    id: 'government-contracts',
    name: 'Government Contracts & Procurement',
    category: 'Financial',
    description: 'Request contract documents, bids, and procurement records',
    icon: <DollarSign className="h-6 w-6" />,
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    variables: [
      'YOUR_NAME',
      'CONTRACT_NUMBER',
      'CONTRACTOR_NAME',
      'DATE_RANGE',
      'PROJECT_DESCRIPTION',
    ],
    tips: [
      'Contract numbers help narrow down your request',
      'Include a date range to limit the scope',
      'Request both the contract and any amendments',
    ],
    content: `Dear Records Custodian:

Pursuant to the Freedom of Information Act (5 U.S.C. § 552), I hereby request copies of the following records:

1. The complete contract, including all exhibits, attachments, and amendments, for [CONTRACT_NUMBER or PROJECT_DESCRIPTION]

2. All proposals and bids submitted in response to the solicitation for this contract

3. The evaluation criteria and scoring documents used to assess proposals

4. Communications between agency officials and [CONTRACTOR_NAME] regarding this contract for the period of [DATE_RANGE]

5. All invoices, payment records, and performance evaluations associated with this contract

6. Any task orders, modifications, or change orders issued under this contract

7. Correspondence regarding any disputes, claims, or protests related to this procurement

Please include any relevant procurement justification documents and sole-source determinations if applicable.

I am prepared to pay reasonable search and duplication fees. If costs are expected to exceed $100, please contact me for approval before proceeding. Electronic copies in PDF format are preferred.

This request is made in the public interest to promote transparency in government spending and contractor accountability. I therefore request a fee waiver.

Please notify me if any portion of this request will be denied, along with the specific exemptions claimed and appeal procedures.

Thank you for your prompt attention to this matter.

Sincerely,
[YOUR_NAME]`,
  },
  {
    id: 'personnel-records',
    name: 'Public Employee Records',
    category: 'Personnel',
    description: 'Request salary, employment history, and disciplinary records of public employees',
    icon: <Users className="h-6 w-6" />,
    iconBg: 'bg-blue-500/20 text-blue-400',
    variables: ['YOUR_NAME', 'EMPLOYEE_NAME', 'DEPARTMENT', 'DATE_RANGE', 'POSITION_TITLE'],
    tips: [
      'Salary and position information is usually public',
      'Disciplinary records may have privacy restrictions',
      'Some states have specific public employee disclosure laws',
    ],
    content: `Dear Public Records Officer:

Under the Freedom of Information Act and applicable state open records statutes, I am requesting the following records pertaining to [EMPLOYEE_NAME], employed by [DEPARTMENT]:

1. Current and historical salary information, including any bonuses, overtime, or supplemental compensation

2. Current position title, job description, and employment start date

3. Educational qualifications and certifications required for and held in connection with their position

4. Records of any disciplinary actions that are public record under applicable law

5. Any complaints filed against this individual that resulted in formal findings

6. Employment contract, if any, including terms of any severance agreements

7. Records of outside employment approvals or financial disclosure statements, if publicly available

I understand that certain personnel records may be exempt from disclosure. For any records withheld, please identify the specific exemption and provide a Vaughn index of withheld documents.

I am willing to pay reasonable fees for this request. Please notify me if costs will exceed $50 prior to processing. Electronic delivery is acceptable.

Please confirm receipt and provide an estimated response timeline.

Regards,
[YOUR_NAME]`,
  },
  {
    id: 'emails-communications',
    name: 'Official Communications & Emails',
    category: 'Communications',
    description: 'Request emails, memos, and official correspondence',
    icon: <Mail className="h-6 w-6" />,
    iconBg: 'bg-purple-500/20 text-purple-400',
    variables: ['YOUR_NAME', 'OFFICIAL_NAMES', 'SUBJECT_MATTER', 'DATE_RANGE', 'KEYWORDS'],
    tips: [
      'Use specific date ranges to narrow results',
      'Include relevant keywords or phrases',
      'Consider requesting text messages and chat logs too',
    ],
    content: `Dear FOIA Officer:

Pursuant to the Freedom of Information Act, I request copies of the following electronic communications:

1. All emails sent to, from, or copying [OFFICIAL_NAMES] regarding [SUBJECT_MATTER] during the period [DATE_RANGE]

2. Any text messages, instant messages, or other electronic communications on government devices or accounts related to this subject

3. Calendar entries, meeting invitations, and scheduling communications related to [SUBJECT_MATTER]

4. Memoranda, briefing documents, or talking points prepared in connection with this matter

Search terms that may assist in identifying responsive records include: [KEYWORDS]

Please search all email accounts, servers, and backup systems that may contain responsive records, including:
- Primary government email accounts
- Archived or deleted messages (if retrievable)
- Any records that may have been forwarded to personal accounts

For any records withheld as privileged or exempt, please provide a privilege log identifying the document, date, author, recipient, subject, and specific exemption claimed.

I am prepared to pay reasonable duplication costs. Please advise if fees will exceed $75 before proceeding. Electronic production in native format is preferred.

Thank you for your cooperation.

Sincerely,
[YOUR_NAME]`,
  },
  {
    id: 'incident-reports',
    name: 'Incident & Accident Reports',
    category: 'Law Enforcement',
    description: 'Request police reports, accident investigations, and incident documentation',
    icon: <AlertCircle className="h-6 w-6" />,
    iconBg: 'bg-amber-500/20 text-amber-400',
    variables: [
      'YOUR_NAME',
      'INCIDENT_DATE',
      'INCIDENT_LOCATION',
      'REPORT_NUMBER',
      'PARTIES_INVOLVED',
    ],
    tips: [
      'Report numbers expedite the search process',
      'Include your relationship to the incident if applicable',
      'Some information may be redacted for ongoing investigations',
    ],
    content: `Dear Records Division:

Under applicable freedom of information and public records laws, I am requesting copies of the following incident documentation:

1. The complete incident report, including the narrative, for the incident occurring on [INCIDENT_DATE] at [INCIDENT_LOCATION], report number [REPORT_NUMBER if known]

2. All supplemental reports, follow-up investigations, and case status updates

3. Witness statements and interview notes

4. Photographs, diagrams, or other visual documentation

5. 911 call recordings and dispatch logs related to this incident

6. Names and badge numbers of responding officers

7. Any citations, arrests, or charges filed in connection with this incident

Parties involved include: [PARTIES_INVOLVED]

I understand that portions of these records may be subject to redaction under applicable exemptions. Please provide all releasable portions and identify any redactions made.

I am the [state your connection: victim, witness, involved party, journalist, researcher, etc.] and am requesting these records for [state purpose if helpful].

Standard reproduction fees are acceptable. Please contact me if costs will exceed $40.

Please respond within the statutory timeframe.

Respectfully,
[YOUR_NAME]`,
  },
  {
    id: 'policy-procedures',
    name: 'Agency Policies & Procedures',
    category: 'Administrative',
    description: 'Request internal policies, standard operating procedures, and guidelines',
    icon: <ClipboardCopy className="h-6 w-6" />,
    iconBg: 'bg-teal-500/20 text-teal-400',
    variables: ['YOUR_NAME', 'POLICY_TOPIC', 'DEPARTMENT', 'DATE_RANGE'],
    tips: [
      'Policies are generally public records',
      'Request historical versions to see changes over time',
      'Include training materials in your request',
    ],
    content: `Dear Records Officer:

Under the Freedom of Information Act, I am requesting copies of the following policy documents from [DEPARTMENT]:

1. All current policies, procedures, and guidelines relating to [POLICY_TOPIC]

2. Standard operating procedures (SOPs) governing this area

3. Any directives, orders, or memoranda establishing or modifying these policies

4. Training materials, manuals, or curricula related to these policies

5. Previous versions of these policies in effect during [DATE_RANGE], if different from current versions

6. Records of any internal reviews, audits, or evaluations of these policies

7. Any legal opinions or guidance documents interpreting these policies

If certain provisions are redacted as law enforcement sensitive or for similar reasons, please provide the unredacted portions and explain the basis for each redaction.

I am requesting these documents to better understand agency operations and ensure public accountability. I request a fee waiver as this request serves the public interest.

If fees are necessary, please advise before processing if they will exceed $25.

Thank you for your assistance.

Sincerely,
[YOUR_NAME]`,
  },
  {
    id: 'complaint-records',
    name: 'Complaints & Investigations',
    category: 'Oversight',
    description: 'Request records of complaints, investigations, and disciplinary proceedings',
    icon: <Gavel className="h-6 w-6" />,
    iconBg: 'bg-rose-500/20 text-rose-400',
    variables: [
      'YOUR_NAME',
      'SUBJECT_OF_COMPLAINT',
      'AGENCY_DIVISION',
      'DATE_RANGE',
      'COMPLAINT_TYPE',
    ],
    tips: [
      'Closed investigations are more likely to be released',
      'Aggregate statistics may be available if individual records are protected',
      'Request the complaint forms used by the agency',
    ],
    content: `Dear FOIA Officer:

Pursuant to the Freedom of Information Act and applicable open records laws, I request the following records from [AGENCY_DIVISION]:

1. All complaints filed regarding [SUBJECT_OF_COMPLAINT or COMPLAINT_TYPE] during [DATE_RANGE]

2. Investigation reports, findings, and dispositions for these complaints

3. Statistical data on complaints received, categorized by type, outcome, and any other tracked metrics

4. Records of any disciplinary actions, sanctions, or corrective measures resulting from these complaints

5. The complaint intake form and procedures used by your office

6. Any annual reports or summaries regarding complaint trends and outcomes

7. Settlement agreements or consent decrees, with appropriate redactions for personally identifiable information of private citizens

I understand that identifying information of complainants may need to be redacted. I am primarily interested in understanding patterns, outcomes, and accountability measures.

This request is made in the public interest for government oversight purposes. I respectfully request a fee waiver.

Please provide an estimated timeline and contact me if clarification would help expedite this request.

Regards,
[YOUR_NAME]`,
  },
  {
    id: 'meeting-records',
    name: 'Public Meeting Records',
    category: 'Administrative',
    description: 'Request agendas, minutes, recordings, and materials from public meetings',
    icon: <MessageSquare className="h-6 w-6" />,
    iconBg: 'bg-indigo-500/20 text-indigo-400',
    variables: ['YOUR_NAME', 'MEETING_DATE', 'BOARD_COMMITTEE_NAME', 'AGENDA_TOPICS'],
    tips: [
      'Many agencies post meeting materials online',
      'Audio/video recordings may be available',
      'Include executive sessions in your request if relevant',
    ],
    content: `Dear Clerk/Records Officer:

Under applicable open meetings and public records laws, I am requesting the following records related to [BOARD_COMMITTEE_NAME] meetings:

1. Agendas, meeting packets, and supporting materials for meetings held on [MEETING_DATE or during DATE_RANGE]

2. Approved minutes from these meetings

3. Audio and/or video recordings of the proceedings

4. Presentation slides, reports, or documents referenced during the meetings

5. Roll call votes and voting records for motions considered

6. Written public comments submitted for the record

7. Any materials distributed to members in preparation for executive/closed sessions, to the extent they are public record

I am particularly interested in discussions related to [AGENDA_TOPICS].

If recordings are maintained, please advise on the format and any applicable copying fees. Electronic copies are preferred where available.

Please provide these records at your earliest convenience.

Thank you,
[YOUR_NAME]`,
  },
];

/**
 * Category list for filtering
 */
const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Law Enforcement', label: 'Law Enforcement' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Personnel', label: 'Personnel' },
  { value: 'Communications', label: 'Communications' },
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Oversight', label: 'Oversight' },
];

/**
 * Saved custom template structure
 */
interface SavedTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: string;
}

/**
 * Templates browsing page component
 */
export default function TemplatesPage() {
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SavedTemplate | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAuth();
    // Load saved templates from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SAVED_TEMPLATES_KEY);
        if (stored) {
          setSavedTemplates(JSON.parse(stored));
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

  const saveTemplate = (template: SavedTemplate) => {
    const updated = [...savedTemplates.filter((t) => t.id !== template.id), template];
    setSavedTemplates(updated);
    localStorage.setItem(SAVED_TEMPLATES_KEY, JSON.stringify(updated));
  };

  const deleteTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem(SAVED_TEMPLATES_KEY, JSON.stringify(updated));
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyTemplate = async (template: Template) => {
    await navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
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
                className="text-sm text-surface-400 transition-colors hover:text-surface-100"
              >
                Agencies
              </a>
              <a
                href="/templates"
                className="flex items-center gap-1.5 text-sm font-medium text-accent-400"
              >
                <ClipboardCopy className="h-4 w-4" />
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
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
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
                      type="button"
                      onClick={handleLogout}
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
          <h1 className="text-2xl font-bold text-surface-100">Request Templates</h1>
          <p className="text-surface-400">
            Professional FOIA request templates for various record types
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <ClipboardCopy className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 py-3 pl-12 pr-4 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 focus:border-accent-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              showSavedOnly
                ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                : 'border-surface-700 text-surface-300 hover:border-surface-600 hover:bg-surface-800'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${showSavedOnly ? 'fill-current' : ''}`} />
            My Templates
            {savedTemplates.length > 0 && (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  showSavedOnly
                    ? 'bg-amber-500 text-surface-950'
                    : 'bg-surface-700 text-surface-300'
                }`}
              >
                {savedTemplates.length}
              </span>
            )}
          </button>
          {isAuth && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          )}
        </div>

        {/* Saved Templates Section */}
        {showSavedOnly && (
          <div className="mb-6">
            {savedTemplates.length === 0 ? (
              <div className="rounded-xl border border-surface-800 bg-surface-900/50 py-12 text-center">
                <Bookmark className="mx-auto h-10 w-10 text-surface-600" />
                <p className="mt-4 text-lg font-medium text-surface-300">No saved templates yet</p>
                <p className="mt-1 text-surface-500">Create a custom template to get started</p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-surface-950 transition-all hover:bg-accent-400"
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group rounded-xl border border-surface-800 bg-surface-900/50 p-5 transition-all hover:border-surface-700 hover:bg-surface-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                          <Bookmark className="h-5 w-5 fill-current" />
                        </div>
                        <div>
                          <h3 className="font-medium text-surface-100">{template.name}</h3>
                          <span className="inline-block mt-1 rounded-full bg-surface-800 px-2 py-0.5 text-xs text-surface-400">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(template.id)}
                        className="rounded-lg p-1.5 text-surface-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-3 text-sm text-surface-400 line-clamp-2">
                      {template.content.slice(0, 100)}...
                    </p>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTemplate(template)}
                        className="flex-1 rounded-lg border border-surface-700 px-3 py-2 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(template.content);
                          setCopiedId(template.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/20"
                      >
                        {copiedId === template.id ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Grid */}
        {!showSavedOnly && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group rounded-xl border border-surface-800 bg-surface-900/50 p-5 transition-all hover:border-surface-700 hover:bg-surface-900"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${template.iconBg}`}
                  >
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-surface-100">{template.name}</h3>
                    </div>
                    <span className="inline-block mt-1 rounded-full bg-surface-800 px-2 py-0.5 text-xs text-surface-400">
                      {template.category}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm text-surface-400 line-clamp-2">{template.description}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(template)}
                    className="flex-1 rounded-lg border border-surface-700 px-3 py-2 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => copyTemplate(template)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/20"
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showSavedOnly && filteredTemplates.length === 0 && (
          <div className="rounded-xl border border-surface-800 bg-surface-900/50 py-16 text-center">
            <ClipboardCopy className="mx-auto h-12 w-12 text-surface-600" />
            <p className="mt-4 text-lg font-medium text-surface-300">No templates found</p>
            <p className="mt-1 text-surface-500">Try adjusting your search or category filter</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 rounded-xl border border-surface-800 bg-surface-900/50 p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Using These Templates</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-medium text-surface-200 mb-2">1. Choose a Template</h3>
              <p className="text-sm text-surface-400">
                Select the template that best matches the type of records you're seeking. Each
                template includes proper legal citations and formatting.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-surface-200 mb-2">2. Customize Your Request</h3>
              <p className="text-sm text-surface-400">
                Replace the bracketed placeholders with your specific information. Be as detailed as
                possible to help the agency locate your records.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-surface-200 mb-2">3. Submit Your Request</h3>
              <p className="text-sm text-surface-400">
                Create a new request in FOIA Stream using your customized template, or submit
                directly to the agency via their preferred method.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-surface-800 p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${selectedTemplate.iconBg}`}
                >
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-surface-100">
                    {selectedTemplate.name}
                  </h2>
                  <span className="inline-block mt-1 rounded-full bg-surface-800 px-2 py-0.5 text-xs text-surface-400">
                    {selectedTemplate.category}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Variables */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-surface-300 mb-2">Required Information</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((variable) => (
                    <code
                      key={variable}
                      className="rounded bg-accent-500/10 px-2 py-1 text-xs font-mono text-accent-400"
                    >
                      [{variable}]
                    </code>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-surface-300 mb-2">Tips</h3>
                <ul className="space-y-1">
                  {selectedTemplate.tips.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-sm text-surface-400">
                      <Check className="h-4 w-4 text-accent-400 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Template Content */}
              <div>
                <h3 className="text-sm font-medium text-surface-300 mb-2">Template</h3>
                <pre className="rounded-lg border border-surface-700 bg-surface-800/50 p-4 text-sm text-surface-300 whitespace-pre-wrap font-mono overflow-x-auto">
                  {selectedTemplate.content}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-surface-800 p-4 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 rounded-lg border border-surface-700 px-4 py-3 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  copyTemplate(selectedTemplate);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400"
              >
                {copiedId === selectedTemplate.id ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {(showCreateModal || editingTemplate) && (
        <CreateTemplateModal
          template={editingTemplate}
          onSave={(template) => {
            saveTemplate(template);
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Create/Edit Template Modal Component
 */
function CreateTemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: SavedTemplate | null;
  onSave: (template: SavedTemplate) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'Custom');
  const [content, setContent] = useState(template?.content || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: template?.id || `custom-${Date.now()}`,
      name,
      category,
      content,
      createdAt: template?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 p-6">
          <h2 className="text-xl font-semibold text-surface-100">
            {template ? 'Edit Template' : 'Create Custom Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label
              htmlFor="template-name"
              className="block text-sm font-medium text-surface-300 mb-2"
            >
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              id="template-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Custom FOIA Request"
              className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>

          <div>
            <label
              htmlFor="template-category"
              className="block text-sm font-medium text-surface-300 mb-2"
            >
              Category
            </label>
            <select
              id="template-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 focus:border-accent-500 focus:outline-none"
            >
              <option value="Custom">Custom</option>
              <option value="Law Enforcement">Law Enforcement</option>
              <option value="Financial">Financial</option>
              <option value="Personnel">Personnel</option>
              <option value="Communications">Communications</option>
              <option value="Administrative">Administrative</option>
              <option value="Oversight">Oversight</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="template-content"
              className="block text-sm font-medium text-surface-300 mb-2"
            >
              Template Content <span className="text-red-400">*</span>
            </label>
            <textarea
              id="template-content"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder={`Dear FOIA Officer:

Under the provisions of the Freedom of Information Act...

[Your template content here]

Respectfully,
[YOUR_NAME]`}
              className="w-full resize-none rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 font-mono text-sm transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <p className="mt-2 text-xs text-surface-500">
              Tip: Use [BRACKETS] for variables that should be filled in when using the template
            </p>
          </div>
        </form>

        <div className="border-t border-surface-800 p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-surface-700 px-4 py-3 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name || !content}
            className="flex-1 rounded-lg bg-accent-500 px-4 py-3 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
