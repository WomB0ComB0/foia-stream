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
 * @file Auto-Redaction Templates Service
 * @module services/auto-redaction
 * @author FOIA Stream Team
 * @description Provides pre-defined and custom redaction templates for common PII patterns.
 *              Templates define regex patterns for automatic detection of sensitive information
 *              such as SSNs, phone numbers, emails, addresses, and more.
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 * @compliance GDPR Article 17 (Right to Erasure)
 */

import { logger } from '@/lib/logger';
import { Schema as S } from 'effect';

// ============================================
// Types
// ============================================

/**
 * Sensitivity level of the data being redacted
 */
export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Category of PII being redacted
 */
export type PIICategory =
  | 'identity' // SSN, driver's license, passport
  | 'financial' // Credit cards, bank accounts
  | 'contact' // Phone, email, address
  | 'health' // Medical record numbers, health info
  | 'legal' // Case numbers, badge numbers
  | 'biometric' // Physical descriptions
  | 'custom'; // User-defined patterns

/**
 * A single redaction pattern within a template
 * @schema
 */
export const RedactionPatternSchema = S.Struct({
  /** Pattern identifier */
  id: S.String,
  /** Display name */
  name: S.String,
  /** Description of what this pattern matches */
  description: S.String,
  /** Regular expression pattern */
  pattern: S.String,
  /** Regex flags (default: 'gi') */
  flags: S.optional(S.String),
  /** PII category */
  category: S.String as S.Schema<PIICategory>,
  /** Sensitivity level */
  sensitivity: S.String as S.Schema<SensitivityLevel>,
  /** Whether enabled by default */
  enabledByDefault: S.Boolean,
  /** Example matches for testing */
  examples: S.Array(S.String),
  /** Label to apply on redacted areas */
  redactionLabel: S.String,
});
export type RedactionPattern = typeof RedactionPatternSchema.Type;

/**
 * A redaction template containing multiple patterns
 * @schema
 */
export const RedactionTemplateSchema = S.Struct({
  /** Template identifier */
  id: S.String,
  /** Display name */
  name: S.String,
  /** Template description */
  description: S.String,
  /** Category/use case */
  category: S.String,
  /** Patterns included in this template */
  patterns: S.mutable(S.Array(RedactionPatternSchema)),
  /** Whether this is a system template */
  isSystem: S.Boolean,
  /** Accuracy disclaimer */
  disclaimer: S.String,
  /** Version number */
  version: S.String,
  /** Creation timestamp */
  createdAt: S.String,
  /** Last update timestamp */
  updatedAt: S.String,
});
export type RedactionTemplate = typeof RedactionTemplateSchema.Type;

/**
 * Result of pattern matching in text
 * @schema
 */
export const PatternMatchSchema = S.Struct({
  /** Pattern that matched */
  patternId: S.String,
  /** Pattern name */
  patternName: S.String,
  /** The matched text */
  matchedText: S.String,
  /** Start index in original text */
  startIndex: S.Number,
  /** End index in original text */
  endIndex: S.Number,
  /** Sensitivity level */
  sensitivity: S.String as S.Schema<SensitivityLevel>,
  /** Suggested redaction label */
  redactionLabel: S.String,
});
export type PatternMatch = typeof PatternMatchSchema.Type;

/**
 * Result of scanning text with templates
 * @schema
 */
export const ScanResultSchema = S.Struct({
  /** Total matches found */
  totalMatches: S.Number,
  /** Matches grouped by pattern */
  matchesByPattern: S.Record({ key: S.String, value: S.Array(PatternMatchSchema) }),
  /** Matches grouped by sensitivity */
  matchesBySensitivity: S.Record({
    key: S.String as S.Schema<SensitivityLevel>,
    value: S.Array(PatternMatchSchema),
  }),
  /** All matches in order of appearance */
  allMatches: S.mutable(S.Array(PatternMatchSchema)),
  /** Redacted text output */
  redactedText: S.String,
  /** Patterns used for scanning */
  patternsUsed: S.mutable(S.Array(S.String)),
  /** Processing time in ms */
  processingTimeMs: S.Number,
});
export type ScanResult = typeof ScanResultSchema.Type;

// ============================================
// Built-in Patterns
// ============================================

/**
 * Social Security Number patterns
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 */
const SSN_PATTERN: RedactionPattern = {
  id: 'ssn',
  name: 'Social Security Number',
  description: 'Matches US Social Security Numbers in various formats',
  pattern: '\\b(?!000|666|9\\d{2})\\d{3}[-\\s]?(?!00)\\d{2}[-\\s]?(?!0000)\\d{4}\\b',
  flags: 'g',
  category: 'identity',
  sensitivity: 'critical',
  enabledByDefault: true,
  examples: ['123-45-6789', '123 45 6789', '123456789'],
  redactionLabel: 'SSN',
};

/**
 * Driver's License patterns (multi-state)
 */
const DRIVERS_LICENSE_PATTERN: RedactionPattern = {
  id: 'drivers_license',
  name: "Driver's License Number",
  description: "Matches common US driver's license number formats",
  pattern: '\\b[A-Z]{1,2}\\d{5,8}\\b|\\b\\d{7,9}\\b(?=.*license|.*DL|.*driver)',
  flags: 'gi',
  category: 'identity',
  sensitivity: 'high',
  enabledByDefault: true,
  examples: ['A1234567', 'DL123456789'],
  redactionLabel: 'DL#',
};

/**
 * Credit card number patterns
 */
const CREDIT_CARD_PATTERN: RedactionPattern = {
  id: 'credit_card',
  name: 'Credit Card Number',
  description: 'Matches major credit card number formats',
  pattern:
    '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b|\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b',
  flags: 'g',
  category: 'financial',
  sensitivity: 'critical',
  enabledByDefault: true,
  examples: ['4111111111111111', '4111-1111-1111-1111'],
  redactionLabel: 'CC#',
};

/**
 * Bank account number patterns
 */
const BANK_ACCOUNT_PATTERN: RedactionPattern = {
  id: 'bank_account',
  name: 'Bank Account Number',
  description: 'Matches bank account numbers when mentioned with context',
  pattern: '(?:account|acct)[\\s#:]*\\d{8,17}',
  flags: 'gi',
  category: 'financial',
  sensitivity: 'critical',
  enabledByDefault: true,
  examples: ['Account: 12345678901', 'Acct# 987654321012'],
  redactionLabel: 'BANK ACCT',
};

/**
 * Bank routing number patterns
 */
const ROUTING_NUMBER_PATTERN: RedactionPattern = {
  id: 'routing_number',
  name: 'Bank Routing Number',
  description: 'Matches US bank routing numbers (ABA)',
  pattern: '(?:routing|ABA)[\\s#:]*\\d{9}\\b',
  flags: 'gi',
  category: 'financial',
  sensitivity: 'high',
  enabledByDefault: true,
  examples: ['Routing: 021000021', 'ABA# 123456789'],
  redactionLabel: 'ROUTING#',
};

/**
 * Phone number patterns
 */
const PHONE_PATTERN: RedactionPattern = {
  id: 'phone',
  name: 'Phone Number',
  description: 'Matches US phone numbers in various formats',
  pattern: '\\b(?:\\+?1[-\\s.]?)?(?:\\(?\\d{3}\\)?[-\\s.]?)?\\d{3}[-\\s.]?\\d{4}\\b',
  flags: 'g',
  category: 'contact',
  sensitivity: 'medium',
  enabledByDefault: true,
  examples: ['(555) 123-4567', '+1 555.123.4567', '5551234567'],
  redactionLabel: 'PHONE',
};

/**
 * Email address patterns
 */
const EMAIL_PATTERN: RedactionPattern = {
  id: 'email',
  name: 'Email Address',
  description: 'Matches email addresses',
  pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
  flags: 'gi',
  category: 'contact',
  sensitivity: 'medium',
  enabledByDefault: true,
  examples: ['john.doe@example.com', 'user+tag@domain.org'],
  redactionLabel: 'EMAIL',
};

/**
 * Street address patterns
 */
const ADDRESS_PATTERN: RedactionPattern = {
  id: 'address',
  name: 'Street Address',
  description: 'Matches US street addresses',
  pattern:
    '\\b\\d{1,5}\\s+[A-Za-z]+(?:\\s+[A-Za-z]+)*\\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\\.?\\b',
  flags: 'gi',
  category: 'contact',
  sensitivity: 'medium',
  enabledByDefault: false,
  examples: ['123 Main Street', '456 Oak Ave'],
  redactionLabel: 'ADDRESS',
};

/**
 * ZIP code patterns
 */
const ZIP_CODE_PATTERN: RedactionPattern = {
  id: 'zip_code',
  name: 'ZIP Code',
  description: 'Matches US ZIP codes (5-digit and ZIP+4)',
  pattern: '\\b\\d{5}(?:-\\d{4})?\\b',
  flags: 'g',
  category: 'contact',
  sensitivity: 'low',
  enabledByDefault: false,
  examples: ['90210', '90210-1234'],
  redactionLabel: 'ZIP',
};

/**
 * Date of birth patterns
 */
const DOB_PATTERN: RedactionPattern = {
  id: 'dob',
  name: 'Date of Birth',
  description: 'Matches dates when preceded by DOB/birth context',
  pattern:
    '(?:DOB|date of birth|born|birth date)[:\\s]*(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2})',
  flags: 'gi',
  category: 'identity',
  sensitivity: 'high',
  enabledByDefault: true,
  examples: ['DOB: 01/15/1990', 'Date of Birth: 1990-01-15'],
  redactionLabel: 'DOB',
};

/**
 * Medical record number patterns
 */
const MEDICAL_RECORD_PATTERN: RedactionPattern = {
  id: 'medical_record',
  name: 'Medical Record Number',
  description: 'Matches medical record numbers with context',
  pattern: '(?:MRN|medical record|patient ID)[:\\s#]*[A-Z0-9]{6,12}',
  flags: 'gi',
  category: 'health',
  sensitivity: 'critical',
  enabledByDefault: true,
  examples: ['MRN: 123456', 'Patient ID: ABC123456'],
  redactionLabel: 'MRN',
};

/**
 * Police badge number patterns
 */
const BADGE_NUMBER_PATTERN: RedactionPattern = {
  id: 'badge_number',
  name: 'Badge Number',
  description: 'Matches police/officer badge numbers',
  pattern: '(?:badge|officer)[\\s#:]*(?:number|no\\.?|#)?[:\\s]*\\d{3,7}',
  flags: 'gi',
  category: 'legal',
  sensitivity: 'medium',
  enabledByDefault: false,
  examples: ['Badge #12345', 'Officer Badge Number: 1234567'],
  redactionLabel: 'BADGE#',
};

/**
 * Case/Incident number patterns
 */
const CASE_NUMBER_PATTERN: RedactionPattern = {
  id: 'case_number',
  name: 'Case/Incident Number',
  description: 'Matches legal case and incident numbers',
  pattern: '(?:case|incident|report)[\\s#:]*(?:number|no\\.?|#)?[:\\s]*[A-Z0-9-]{6,20}',
  flags: 'gi',
  category: 'legal',
  sensitivity: 'low',
  enabledByDefault: false,
  examples: ['Case #2024-CR-001234', 'Incident Number: INC-20240101'],
  redactionLabel: 'CASE#',
};

/**
 * IP address patterns
 */
const IP_ADDRESS_PATTERN: RedactionPattern = {
  id: 'ip_address',
  name: 'IP Address',
  description: 'Matches IPv4 addresses',
  pattern:
    '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
  flags: 'g',
  category: 'identity',
  sensitivity: 'medium',
  enabledByDefault: false,
  examples: ['192.168.1.1', '10.0.0.255'],
  redactionLabel: 'IP',
};

/**
 * Passport number patterns
 */
const PASSPORT_PATTERN: RedactionPattern = {
  id: 'passport',
  name: 'Passport Number',
  description: 'Matches US passport numbers',
  pattern: '(?:passport)[\\s#:]*[A-Z0-9]{6,9}',
  flags: 'gi',
  category: 'identity',
  sensitivity: 'critical',
  enabledByDefault: true,
  examples: ['Passport: 123456789', 'Passport #A12345678'],
  redactionLabel: 'PASSPORT',
};

// ============================================
// Built-in Templates
// ============================================

/**
 * Standard PII template for general use
 */
const STANDARD_PII_TEMPLATE: RedactionTemplate = {
  id: 'standard-pii',
  name: 'Standard PII Redaction',
  description: 'Comprehensive template for common personally identifiable information',
  category: 'General',
  patterns: [SSN_PATTERN, CREDIT_CARD_PATTERN, PHONE_PATTERN, EMAIL_PATTERN, DOB_PATTERN],
  isSystem: true,
  disclaimer:
    '⚠️ DISCLAIMER: This automated redaction may not capture all sensitive information. Always manually review the document before finalizing. Accuracy depends on text formatting and quality. This tool is not a substitute for professional review.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/**
 * Financial information template
 */
const FINANCIAL_TEMPLATE: RedactionTemplate = {
  id: 'financial',
  name: 'Financial Information',
  description: 'Template for redacting financial account information',
  category: 'Financial',
  patterns: [CREDIT_CARD_PATTERN, BANK_ACCOUNT_PATTERN, ROUTING_NUMBER_PATTERN, SSN_PATTERN],
  isSystem: true,
  disclaimer:
    '⚠️ DISCLAIMER: Financial data redaction requires careful verification. Account numbers may appear in various formats not covered by these patterns. Always verify manually.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/**
 * Law enforcement/FOIA template
 */
const LAW_ENFORCEMENT_TEMPLATE: RedactionTemplate = {
  id: 'law-enforcement',
  name: 'Law Enforcement Records',
  description: 'Template for police records, incident reports, and body camera transcripts',
  category: 'Law Enforcement',
  patterns: [
    SSN_PATTERN,
    DRIVERS_LICENSE_PATTERN,
    PHONE_PATTERN,
    EMAIL_PATTERN,
    ADDRESS_PATTERN,
    DOB_PATTERN,
    BADGE_NUMBER_PATTERN,
    CASE_NUMBER_PATTERN,
  ],
  isSystem: true,
  disclaimer:
    '⚠️ DISCLAIMER: Law enforcement records may contain sensitive information in unexpected formats. Badge numbers and case numbers may be exempt from redaction depending on jurisdiction. Always consult legal requirements for your specific use case.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/**
 * Healthcare/HIPAA template
 */
const HEALTHCARE_TEMPLATE: RedactionTemplate = {
  id: 'healthcare',
  name: 'Healthcare Records (HIPAA)',
  description: 'Template for medical records and healthcare information',
  category: 'Healthcare',
  patterns: [
    SSN_PATTERN,
    MEDICAL_RECORD_PATTERN,
    PHONE_PATTERN,
    EMAIL_PATTERN,
    ADDRESS_PATTERN,
    DOB_PATTERN,
  ],
  isSystem: true,
  disclaimer:
    '⚠️ DISCLAIMER: HIPAA compliance requires comprehensive protection of PHI. This template covers common patterns but may not capture all protected health information. Professional review is required for HIPAA compliance.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/**
 * Contact information only template
 */
const CONTACT_INFO_TEMPLATE: RedactionTemplate = {
  id: 'contact-info',
  name: 'Contact Information Only',
  description: 'Light template for redacting phone, email, and address only',
  category: 'Contact',
  patterns: [PHONE_PATTERN, EMAIL_PATTERN, ADDRESS_PATTERN, ZIP_CODE_PATTERN],
  isSystem: true,
  disclaimer:
    '⚠️ DISCLAIMER: This template only covers contact information. Other PII such as SSN, financial data, or identification numbers will NOT be redacted.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/**
 * Maximum security template
 */
const MAXIMUM_SECURITY_TEMPLATE: RedactionTemplate = {
  id: 'maximum-security',
  name: 'Maximum Security',
  description: 'Most aggressive template covering all available patterns',
  category: 'Security',
  patterns: [
    SSN_PATTERN,
    DRIVERS_LICENSE_PATTERN,
    CREDIT_CARD_PATTERN,
    BANK_ACCOUNT_PATTERN,
    ROUTING_NUMBER_PATTERN,
    PHONE_PATTERN,
    EMAIL_PATTERN,
    ADDRESS_PATTERN,
    ZIP_CODE_PATTERN,
    DOB_PATTERN,
    MEDICAL_RECORD_PATTERN,
    BADGE_NUMBER_PATTERN,
    CASE_NUMBER_PATTERN,
    IP_ADDRESS_PATTERN,
    PASSPORT_PATTERN,
  ],
  isSystem: true,
  disclaimer:
    '⚠️ DISCLAIMER: This template uses all available patterns and may produce false positives. Numbers that look like SSNs or phone numbers may be redacted even if they are not sensitive. Review carefully before finalizing.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

// ============================================
// Service Class
// ============================================

/**
 * Service for managing and applying auto-redaction templates
 *
 * @class AutoRedactionService
 * @description
 * Provides methods to:
 * - List available redaction templates
 * - Get individual patterns or templates
 * - Scan text for PII matches
 * - Apply redactions to text
 * - Create custom templates
 *
 * @example
 * ```typescript
 * const service = new AutoRedactionService();
 * const result = service.scanText('My SSN is 123-45-6789', ['ssn', 'email']);
 * console.log(`Found ${result.totalMatches} matches`);
 * ```
 *
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 */
export class AutoRedactionService {
  private readonly systemTemplates: RedactionTemplate[];
  private readonly allPatterns: RedactionPattern[];

  constructor() {
    this.systemTemplates = [
      STANDARD_PII_TEMPLATE,
      FINANCIAL_TEMPLATE,
      LAW_ENFORCEMENT_TEMPLATE,
      HEALTHCARE_TEMPLATE,
      CONTACT_INFO_TEMPLATE,
      MAXIMUM_SECURITY_TEMPLATE,
    ];

    this.allPatterns = [
      SSN_PATTERN,
      DRIVERS_LICENSE_PATTERN,
      CREDIT_CARD_PATTERN,
      BANK_ACCOUNT_PATTERN,
      ROUTING_NUMBER_PATTERN,
      PHONE_PATTERN,
      EMAIL_PATTERN,
      ADDRESS_PATTERN,
      ZIP_CODE_PATTERN,
      DOB_PATTERN,
      MEDICAL_RECORD_PATTERN,
      BADGE_NUMBER_PATTERN,
      CASE_NUMBER_PATTERN,
      IP_ADDRESS_PATTERN,
      PASSPORT_PATTERN,
    ];
  }

  /**
   * Get all available templates
   *
   * @returns List of available redaction templates
   */
  getTemplates(): RedactionTemplate[] {
    return this.systemTemplates;
  }

  /**
   * Get a specific template by ID
   *
   * @param id - Template ID
   * @returns Template or null if not found
   */
  getTemplate(id: string): RedactionTemplate | null {
    return this.systemTemplates.find((t) => t.id === id) || null;
  }

  /**
   * Get all available patterns
   *
   * @returns List of all available patterns
   */
  getPatterns(): RedactionPattern[] {
    return this.allPatterns;
  }

  /**
   * Get patterns by category
   *
   * @param category - PII category to filter by
   * @returns Patterns in the specified category
   */
  getPatternsByCategory(category: PIICategory): RedactionPattern[] {
    return this.allPatterns.filter((p) => p.category === category);
  }

  /**
   * Get patterns by sensitivity level
   *
   * @param level - Sensitivity level to filter by
   * @returns Patterns with the specified sensitivity
   */
  getPatternsBySensitivity(level: SensitivityLevel): RedactionPattern[] {
    return this.allPatterns.filter((p) => p.sensitivity === level);
  }

  /**
   * Get a specific pattern by ID
   *
   * @param id - Pattern ID
   * @returns Pattern or null if not found
   */
  getPattern(id: string): RedactionPattern | null {
    return this.allPatterns.find((p) => p.id === id) || null;
  }

  /**
   * Scan text for PII matches using specified patterns
   *
   * @param text - Text to scan
   * @param patternIds - Pattern IDs to use (or 'all' for all patterns)
   * @returns Scan results with all matches found
   *
   * @example
   * ```typescript
   * const result = service.scanText('Call me at 555-123-4567', ['phone']);
   * console.log(result.allMatches); // [{matchedText: '555-123-4567', ...}]
   * ```
   */
  scanText(text: string, patternIds: string[] | 'all'): ScanResult {
    const startTime = Date.now();

    const patternsToUse =
      patternIds === 'all'
        ? this.allPatterns
        : this.allPatterns.filter((p) => patternIds.includes(p.id));

    const allMatches: PatternMatch[] = [];
    const matchesByPattern: Record<string, PatternMatch[]> = {};
    const matchesBySensitivity: Record<SensitivityLevel, PatternMatch[]> = {
      low: [],
      medium: [],
      high: [],
      critical: [],
    };

    for (const pattern of patternsToUse) {
      const regex = new RegExp(pattern.pattern, pattern.flags || 'gi');
      let match: RegExpExecArray | null;

      matchesByPattern[pattern.id] = [];
      const patternMatches = matchesByPattern[pattern.id] || [];
      match = regex.exec(text);
      while (match !== null) {
        const patternMatch: PatternMatch = {
          patternId: pattern.id,
          patternName: pattern.name,
          matchedText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          sensitivity: pattern.sensitivity,
          redactionLabel: pattern.redactionLabel,
        };

        allMatches.push(patternMatch);
        patternMatches.push(patternMatch);
        matchesBySensitivity[pattern.sensitivity].push(patternMatch);
        match = regex.exec(text);
      }
    }

    // Sort matches by position
    allMatches.sort((a, b) => a.startIndex - b.startIndex);

    // Generate redacted text
    let redactedText = text;
    // Apply redactions in reverse order to preserve indices
    const reversedMatches = [...allMatches].sort((a, b) => b.startIndex - a.startIndex);
    for (const match of reversedMatches) {
      redactedText =
        redactedText.substring(0, match.startIndex) +
        `[${match.redactionLabel}]` +
        redactedText.substring(match.endIndex);
    }

    const processingTimeMs = Date.now() - startTime;

    logger.debug(
      {
        patternsUsed: patternsToUse.length,
        matchesFound: allMatches.length,
        processingTimeMs,
      },
      'Text scan completed',
    );

    return {
      totalMatches: allMatches.length,
      matchesByPattern,
      matchesBySensitivity,
      allMatches,
      redactedText,
      patternsUsed: patternsToUse.map((p) => p.id),
      processingTimeMs,
    };
  }

  /**
   * Scan text using a specific template
   *
   * @param text - Text to scan
   * @param templateId - Template ID to use
   * @returns Scan results or null if template not found
   */
  scanWithTemplate(text: string, templateId: string): ScanResult | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      logger.warn({ templateId }, 'Template not found');
      return null;
    }

    const patternIds = template.patterns.map((p) => p.id);
    return this.scanText(text, patternIds);
  }

  /**
   * Get template disclaimer for UI display
   *
   * @param templateId - Template ID
   * @returns Disclaimer text or default disclaimer
   */
  getDisclaimer(templateId?: string): string {
    if (templateId) {
      const template = this.getTemplate(templateId);
      if (template) {
        return template.disclaimer;
      }
    }

    return '⚠️ DISCLAIMER: Automated redaction is not 100% accurate. Always manually review documents before sharing or publishing. Patterns may miss sensitive information or incorrectly flag non-sensitive data.';
  }

  /**
   * Test a pattern against sample text
   *
   * @param patternId - Pattern ID to test
   * @param sampleText - Text to test against
   * @returns Array of matched strings
   */
  testPattern(patternId: string, sampleText: string): string[] {
    const pattern = this.getPattern(patternId);
    if (!pattern) {
      return [];
    }

    const regex = new RegExp(pattern.pattern, pattern.flags || 'gi');
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    match = regex.exec(sampleText);

    while (match !== null) {
      matches.push(match[0]);
      match = regex.exec(sampleText);
    }

    return matches;
  }

  /**
   * Validate a custom regex pattern
   *
   * @param pattern - Regex pattern string
   * @param flags - Regex flags
   * @returns Whether the pattern is valid
   */
  validatePattern(pattern: string, flags = 'gi'): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern, flags);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid regex pattern',
      };
    }
  }
}

/**
 * Singleton instance of the auto-redaction service
 *
 * @constant
 * @type {AutoRedactionService}
 */
export const autoRedactionService = new AutoRedactionService();
