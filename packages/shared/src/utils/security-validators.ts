/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Security validation utilities for threat actor prevention
 * @module utils/security-validators
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 * @compliance OWASP Input Validation
 */

// ============================================
// Threat Pattern Definitions
// ============================================

/**
 * XSS attack patterns
 * Detects script injection, event handlers, and dangerous URIs
 */
const XSS_PATTERNS = [
  // Script tags
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<script\b[^>]*>/gi,
  // Event handlers
  /\bon\w+\s*=/gi,
  // JavaScript URIs
  /javascript\s*:/gi,
  // Data URIs with script content
  /data\s*:\s*text\/html/gi,
  /data\s*:\s*application\/javascript/gi,
  // Expression evaluation
  /expression\s*\(/gi,
  // VBScript
  /vbscript\s*:/gi,
  // SVG with script
  /<svg[^>]*\s+on\w+=/gi,
  // Math with script
  /<math[^>]*\s+on\w+=/gi,
  // Iframe injection
  /<iframe\b[^>]*>/gi,
  // Object/embed injection
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  // Style-based attacks
  /<style\b[^>]*>[\s\S]*?<\/style>/gi,
  // Document manipulation
  /document\s*\.\s*(cookie|domain|write|location)/gi,
  // Window manipulation
  /window\s*\.\s*(location|open|eval)/gi,
  // Eval and Function constructor
  /\beval\s*\(/gi,
  /\bnew\s+Function\s*\(/gi,
  // innerHTML manipulation
  /\.innerHTML\s*=/gi,
  // Prototype pollution
  /__proto__/gi,
  /constructor\s*\[/gi,
];

/**
 * SQL injection patterns
 * Detects common SQL attack vectors
 */
const SQL_INJECTION_PATTERNS = [
  // UNION-based injection
  /\bUNION\s+(ALL\s+)?SELECT\b/gi,
  // DROP/DELETE/TRUNCATE attacks
  /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW)\b/gi,
  /\bDELETE\s+FROM\b/gi,
  /\bTRUNCATE\s+TABLE\b/gi,
  // Comment-based attacks
  /--\s*$/gm,
  /\/\*[\s\S]*?\*\//g,
  // Always-true conditions
  /'\s*OR\s+'[\d\w]+'\s*=\s*'[\d\w]+/gi,
  /'\s*OR\s+\d+\s*=\s*\d+/gi,
  /"\s*OR\s+"[\d\w]+"\s*=\s*"[\d\w]+/gi,
  /1\s*=\s*1/g,
  // Stacked queries
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|EXEC|UNION)/gi,
  // Time-based blind injection
  /SLEEP\s*\(\s*\d+\s*\)/gi,
  /WAITFOR\s+DELAY/gi,
  /BENCHMARK\s*\(/gi,
  // Information schema access
  /INFORMATION_SCHEMA/gi,
  // Hex encoding bypass
  /0x[0-9a-f]+/gi,
  // EXEC/EXECUTE
  /\bEXEC(UTE)?\s*\(/gi,
  // xp_ procedures (SQL Server)
  /\bxp_\w+/gi,
];

/**
 * NoSQL injection patterns
 * Detects MongoDB and other NoSQL attack vectors
 */
const NOSQL_INJECTION_PATTERNS = [
  // MongoDB operators
  /\$(?:gt|gte|lt|lte|ne|eq|in|nin|and|or|not|nor|exists|type|mod|regex|text|where|all|elemMatch|size|slice|expr|jsonSchema|meta)\b/gi,
  // JavaScript execution in MongoDB
  /\$where\s*:/gi,
  /\$function\s*:/gi,
  // Operator injection
  /\{\s*\$[a-z]+\s*:/gi,
  // Array injection
  /\[\s*\$[a-z]+\s*\]/gi,
];

/**
 * Path traversal patterns
 * Detects directory traversal attacks
 */
const PATH_TRAVERSAL_PATTERNS = [
  // Directory traversal
  /\.\.[/\\]/g,
  // URL-encoded traversal
  /%2e%2e[%2f%5c]/gi,
  /%252e%252e%252f/gi,
  // Double-encoded
  /\.\.%2f/gi,
  /\.\.%5c/gi,
  // Null byte injection
  /%00/g,
  // Common sensitive paths
  /\/etc\/passwd/gi,
  /\/etc\/shadow/gi,
  /\/proc\/self/gi,
  /C:\\Windows/gi,
  /C:\\System32/gi,
];

/**
 * Homoglyph patterns
 * Detects Unicode characters that look like ASCII but aren't
 * Used in phishing and IDN homograph attacks
 */
const HOMOGLYPH_MAP: Record<string, string[]> = {
  a: ['а', 'ɑ', 'α', 'а'], // Cyrillic а, Latin alpha, Greek alpha
  c: ['с', 'ϲ', 'ⅽ'], // Cyrillic с, Greek lunate sigma
  e: ['е', 'ε', 'ė'], // Cyrillic е, Greek epsilon
  o: ['о', 'ο', 'ᴏ', '०'], // Cyrillic о, Greek omicron
  p: ['р', 'ρ'], // Cyrillic р, Greek rho
  s: ['ѕ', 'ꜱ'], // Cyrillic ѕ
  x: ['х', 'χ'], // Cyrillic х, Greek chi
  y: ['у', 'γ'], // Cyrillic у, Greek gamma
  B: ['В', 'Β'], // Cyrillic В, Greek Beta
  H: ['Н', 'Η'], // Cyrillic Н, Greek Eta
  K: ['К', 'Κ'], // Cyrillic К, Greek Kappa
  M: ['М', 'Μ'], // Cyrillic М, Greek Mu
  P: ['Р', 'Ρ'], // Cyrillic Р, Greek Rho
  T: ['Т', 'Τ'], // Cyrillic Т, Greek Tau
};

// ============================================
// Detection Functions
// ============================================

export interface ThreatDetectionResult {
  isSafe: boolean;
  threats: ThreatFinding[];
}

export interface ThreatFinding {
  type: ThreatType;
  description: string;
  matchedPattern?: string;
}

export type ThreatType =
  | 'xss'
  | 'sql_injection'
  | 'nosql_injection'
  | 'command_injection'
  | 'path_traversal'
  | 'homoglyph';

/**
 * Detects XSS attack patterns in input
 */
export function containsXSSPatterns(input: string): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  for (const pattern of XSS_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      findings.push({
        type: 'xss',
        description: 'Potential cross-site scripting (XSS) detected',
        matchedPattern: match[0].slice(0, 50),
      });
      break; // One finding per type is enough
    }
  }

  return findings;
}

/**
 * Detects SQL injection patterns in input
 */
export function containsSQLInjection(input: string): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  for (const pattern of SQL_INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      findings.push({
        type: 'sql_injection',
        description: 'Potential SQL injection detected',
        matchedPattern: match[0].slice(0, 50),
      });
      break;
    }
  }

  return findings;
}

/**
 * Detects NoSQL injection patterns in input
 */
export function containsNoSQLInjection(input: string): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      findings.push({
        type: 'nosql_injection',
        description: 'Potential NoSQL injection detected',
        matchedPattern: match[0].slice(0, 50),
      });
      break;
    }
  }

  return findings;
}

/**
 * Detects command injection patterns in input
 * Note: This is strict - may trigger false positives on legitimate characters
 */
export function containsCommandInjection(input: string): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  // Only check for the most dangerous patterns, not all shell chars
  const dangerousPatterns = [
    /\$\([^)]+\)/g, // Command substitution
    /`[^`]+`/g, // Backtick command substitution
    /;\s*(rm|del|cat|wget|curl|nc)\b/gi, // Chained dangerous commands
    /\|\s*(sh|bash|cmd)\b/gi, // Piped to shell
  ];

  for (const pattern of dangerousPatterns) {
    const match = input.match(pattern);
    if (match) {
      findings.push({
        type: 'command_injection',
        description: 'Potential command injection detected',
        matchedPattern: match[0].slice(0, 50),
      });
      break;
    }
  }

  return findings;
}

/**
 * Detects path traversal patterns in input
 */
export function containsPathTraversal(input: string): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      findings.push({
        type: 'path_traversal',
        description: 'Potential path traversal attack detected',
        matchedPattern: match[0].slice(0, 50),
      });
      break;
    }
  }

  return findings;
}

/**
 * Detects homoglyph attacks in input
 * Used to detect phishing attempts using lookalike characters
 */
export function containsHomoglyphs(input: string): ThreatFinding[] {
  const findings: ThreatFinding[] = [];

  for (const [, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
    for (const homoglyph of homoglyphs) {
      if (input.includes(homoglyph)) {
        findings.push({
          type: 'homoglyph',
          description: 'Suspicious lookalike Unicode character detected',
          matchedPattern: homoglyph,
        });
        return findings; // One finding is enough
      }
    }
  }

  return findings;
}

// ============================================
// Main Validation Functions
// ============================================

/**
 * Configuration for threat detection
 */
export interface ThreatDetectionConfig {
  checkXSS?: boolean;
  checkSQLInjection?: boolean;
  checkNoSQLInjection?: boolean;
  checkCommandInjection?: boolean;
  checkPathTraversal?: boolean;
  checkHomoglyphs?: boolean;
}

const DEFAULT_CONFIG: ThreatDetectionConfig = {
  checkXSS: true,
  checkSQLInjection: true,
  checkNoSQLInjection: true,
  checkCommandInjection: false, // Off by default, can cause false positives
  checkPathTraversal: true,
  checkHomoglyphs: true,
};

/**
 * Runs all configured threat detectors on input
 * @param input - The string to check
 * @param config - Optional configuration for which checks to run
 * @returns Detection result with any findings
 */
export function detectThreatPatterns(
  input: string,
  config: ThreatDetectionConfig = DEFAULT_CONFIG,
): ThreatDetectionResult {
  if (!input || typeof input !== 'string') {
    return { isSafe: true, threats: [] };
  }

  const threats: ThreatFinding[] = [];

  if (config.checkXSS !== false) {
    threats.push(...containsXSSPatterns(input));
  }

  if (config.checkSQLInjection !== false) {
    threats.push(...containsSQLInjection(input));
  }

  if (config.checkNoSQLInjection !== false) {
    threats.push(...containsNoSQLInjection(input));
  }

  if (config.checkCommandInjection) {
    threats.push(...containsCommandInjection(input));
  }

  if (config.checkPathTraversal !== false) {
    threats.push(...containsPathTraversal(input));
  }

  if (config.checkHomoglyphs !== false) {
    threats.push(...containsHomoglyphs(input));
  }

  return {
    isSafe: threats.length === 0,
    threats,
  };
}

/**
 * Quick check if input is safe
 * @param input - The string to check
 * @param config - Optional configuration
 * @returns true if no threats detected
 */
export function isSafeInput(input: string, config?: ThreatDetectionConfig): boolean {
  return detectThreatPatterns(input, config).isSafe;
}

/**
 * Sanitizes input for safe display by escaping HTML entities
 * Use this when you need to display potentially unsafe content
 */
export function sanitizeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Normalizes Unicode to prevent homoglyph attacks
 * Converts to NFC form and replaces common lookalikes with ASCII
 */
export function normalizeUnicode(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Normalize to NFC (composed form)
  let normalized = input.normalize('NFC');

  // Replace known homoglyphs with ASCII equivalents
  for (const [ascii, homoglyphs] of Object.entries(HOMOGLYPH_MAP)) {
    for (const homoglyph of homoglyphs) {
      normalized = normalized.replace(new RegExp(homoglyph, 'g'), ascii);
    }
  }

  return normalized;
}

// ============================================
// Zod Validation Helpers
// ============================================

/**
 * Error message for threat detection
 */
export const THREAT_DETECTED_MESSAGE = 'Input contains potentially unsafe content';

/**
 * Validates that a string is safe from common attack patterns
 * For use as a Zod refinement
 */
export function validateSafeText(input: string): boolean {
  return isSafeInput(input);
}

/**
 * Validates that a name field is safe
 * More permissive than general text - allows international characters
 */
export function validateSafeName(input: string): boolean {
  // Normalize first to handle combining characters
  const normalized = input.normalize('NFC');

  // Names shouldn't contain HTML or script patterns
  if (!isSafeInput(normalized, { checkCommandInjection: false })) {
    return false;
  }

  // Additional check: names should be primarily letters, spaces, hyphens, apostrophes
  // This allows international names while blocking obvious injection attempts
  const namePattern = /^[\p{L}\p{M}'\-\s.]+$/u;
  return namePattern.test(normalized);
}

/**
 * Validates email addresses with additional security checks
 */
export function validateSafeEmail(input: string): boolean {
  // Standard format check
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input)) {
    return false;
  }

  // Check for injection patterns in email
  // Emails shouldn't have HTML, SQL commands, etc.
  const result = detectThreatPatterns(input, {
    checkXSS: true,
    checkSQLInjection: true,
    checkNoSQLInjection: true,
    checkCommandInjection: false,
    checkPathTraversal: false,
    checkHomoglyphs: true,
  });

  return result.isSafe;
}

/**
 * Get human-readable error for a threat detection result
 */
export function getThreatErrorMessage(result: ThreatDetectionResult): string {
  if (result.isSafe) return '';

  const threat = result.threats[0];
  switch (threat?.type) {
    case 'xss':
      return 'Input contains potentially malicious script content';
    case 'sql_injection':
      return 'Input contains potentially malicious database commands';
    case 'nosql_injection':
      return 'Input contains potentially malicious query operators';
    case 'command_injection':
      return 'Input contains potentially malicious system commands';
    case 'path_traversal':
      return 'Input contains potentially malicious file path characters';
    case 'homoglyph':
      return 'Input contains suspicious lookalike characters';
    default:
      return THREAT_DETECTED_MESSAGE;
  }
}
