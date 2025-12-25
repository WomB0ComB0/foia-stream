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
 * @file Input sanitization utilities for XSS prevention and data validation
 * @module @foia-stream/shared/utils/sanitize
 * @author FOIA Stream Team
 * @description Provides type-safe input sanitization using Effect Schema for validation.
 *              Includes utilities for HTML escaping, URL validation, PII redaction, and more.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import { Either, Option, type ParseResult, Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Schema for URL protocol validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const UrlProtocolSchema = S.Literal('http:', 'https:', 'mailto:', 'tel:', 'ftp:');
export type UrlProtocol = S.Schema.Type<typeof UrlProtocolSchema>;

/**
 * Schema for PII redaction options
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
export const PIIRedactionOptionsSchema = S.Struct({
  redactEmails: S.optional(S.Boolean),
  redactPhones: S.optional(S.Boolean),
  redactSSN: S.optional(S.Boolean),
  redactCreditCards: S.optional(S.Boolean),
  redactIPs: S.optional(S.Boolean),
  redactDates: S.optional(S.Boolean),
});
export type PIIRedactionOptions = S.Schema.Type<typeof PIIRedactionOptionsSchema>;

/**
 * Schema for user input validation options
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const UserInputOptionsSchema = S.Struct({
  maxLength: S.optional(S.Number.pipe(S.positive(), S.int())),
  allowHtml: S.optional(S.Boolean),
  allowNewlines: S.optional(S.Boolean),
  trimWhitespace: S.optional(S.Boolean),
});
export type UserInputOptions = S.Schema.Type<typeof UserInputOptionsSchema>;

/**
 * Schema for safe URL - validates URL format and protocol
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const SafeUrlSchema = S.String.pipe(
  S.filter(
    (url) => {
      if (!url || url.trim() === '') return false;
      // Allow relative URLs
      if (url.startsWith('/') && !url.startsWith('//')) return true;
      try {
        const parsed = new URL(url);
        const safeProtocols = ['http:', 'https:', 'mailto:'];
        return safeProtocols.includes(parsed.protocol);
      } catch {
        return /^[a-zA-Z0-9/_.-]+$/.test(url);
      }
    },
    { message: () => 'Invalid or unsafe URL' },
  ),
);
export type SafeUrl = S.Schema.Type<typeof SafeUrlSchema>;

/**
 * Schema for sanitized HTML-safe string
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const SanitizedStringSchema = S.String.pipe(
  S.transform(S.String, {
    decode: (s) => escapeHtml(s),
    encode: (s) => s,
  }),
);
export type SanitizedString = S.Schema.Type<typeof SanitizedStringSchema>;

/**
 * Schema for email address validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const EmailSchema = S.String.pipe(
  S.pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, {
    message: () => 'Invalid email address format',
  }),
);
export type Email = S.Schema.Type<typeof EmailSchema>;

/**
 * Schema for phone number validation (US format)
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const PhoneNumberSchema = S.String.pipe(
  S.pattern(/^(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, {
    message: () => 'Invalid phone number format',
  }),
);
export type PhoneNumber = S.Schema.Type<typeof PhoneNumberSchema>;

/**
 * Schema for SSN validation (US format)
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const SSNSchema = S.String.pipe(
  S.pattern(/^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/, {
    message: () => 'Invalid SSN format',
  }),
);
export type SSN = S.Schema.Type<typeof SSNSchema>;

/**
 * Schema for credit card number validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const CreditCardSchema = S.String.pipe(
  S.pattern(/^(?:\d{4}[-\s]?){3}\d{4}$|^\d{15,16}$/, {
    message: () => 'Invalid credit card format',
  }),
);
export type CreditCard = S.Schema.Type<typeof CreditCardSchema>;

/**
 * Schema for IPv4 address validation
 */
export const IPv4Schema = S.String.pipe(
  S.pattern(/^(?:\d{1,3}\.){3}\d{1,3}$/, {
    message: () => 'Invalid IPv4 address format',
  }),
);
export type IPv4 = S.Schema.Type<typeof IPv4Schema>;

// ============================================
// Sanitization Functions
// ============================================

/**
 * Escapes special HTML characters in a string to their corresponding HTML entities,
 * preventing direct injection of HTML and JavaScript when rendering untrusted content.
 *
 * @param text - The plain text to escape.
 * @returns The escaped string safe for HTML rendering.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>');
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 * ```
 */
export const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates and sanitizes a user-supplied URL using Effect Schema.
 * Returns an Either with the sanitized URL or an error.
 *
 * @param url - The URL to be validated and sanitized.
 * @param allowedProtocols - Array of allowed URL protocols.
 * @returns Either containing the sanitized URL or an error.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const result = sanitizeUrlEffect('https://example.com');
 * // Either.right('https://example.com')
 *
 * const invalid = sanitizeUrlEffect('javascript:alert(1)');
 * // Either.left(ParseError)
 * ```
 */
export const sanitizeUrlEffect = (
  url: string,
  allowedProtocols: readonly string[] = ['http:', 'https:', 'mailto:'],
): Either.Either<string, ParseResult.ParseError> => {
  const CustomSafeUrlSchema = S.String.pipe(
    S.filter(
      (u) => {
        if (!u || u.trim() === '') return false;
        const trimmed = u.trim();
        // Allow relative URLs
        if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
        try {
          const parsed = new URL(trimmed);
          if (!allowedProtocols.includes(parsed.protocol)) return false;
          // Check for script injection in hostname
          if (parsed.hostname.includes('javascript:') || parsed.hostname.includes('data:')) {
            return false;
          }
          return true;
        } catch {
          return (
            /^[a-zA-Z0-9/_.-]+$/.test(trimmed) &&
            !trimmed.includes('javascript:') &&
            !trimmed.includes('data:')
          );
        }
      },
      { message: () => 'Invalid or unsafe URL' },
    ),
  );

  return S.decodeUnknownEither(CustomSafeUrlSchema)(url);
};

/**
 * Validates and sanitizes a user-supplied URL, ensuring it conforms to allowed protocols
 * and is not a vector for injection attacks like `javascript:` or `data:`.
 *
 * @param url - The URL to be validated and sanitized.
 * @param allowedProtocols - Array of allowed URL protocols.
 * @returns The sanitized URL if valid, or an empty string if unsafe.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://example.com'); // 'https://example.com'
 * sanitizeUrl('javascript:alert(1)'); // ''
 * ```
 */
export const sanitizeUrl = (
  url: string,
  allowedProtocols: readonly string[] = ['http:', 'https:', 'mailto:'],
): string => {
  const result = sanitizeUrlEffect(url, allowedProtocols);
  return Either.isRight(result) ? result.right : '';
};

/**
 * Validates user input using Effect Schema and returns an Either.
 *
 * @param input - User input to validate and sanitize.
 * @param options - Validation options.
 * @returns Either containing sanitized input or parse error.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const validateUserInputEffect = (
  input: string,
  options: UserInputOptions = {},
): Either.Either<string, ParseResult.ParseError> => {
  const {
    maxLength = 500,
    allowHtml = false,
    allowNewlines = false,
    trimWhitespace = true,
  } = options;

  const InputSchema = S.String.pipe(
    S.transform(S.String, {
      decode: (s) => {
        let result = s;

        // Trim whitespace
        if (trimWhitespace) {
          result = result.trim();
        }

        // Remove HTML tags if not allowed
        if (!allowHtml) {
          let prev: string;
          do {
            prev = result;
            result = result.replace(/<[^>]*>/g, '');
          } while (result !== prev);
        }

        // Handle newlines
        if (!allowNewlines) {
          result = result.replace(/[\r\n]+/g, ' ');
        }

        // Normalize whitespace
        result = result.replace(/\s+/g, ' ');

        // Remove dangerous patterns
        result = result
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '')
          .replace(/vbscript:/gi, '')
          .replace(/on\w+=/gi, ''); // Remove event handlers

        // Truncate to max length
        return result.slice(0, maxLength);
      },
      encode: (s) => s,
    }),
  );

  return S.decodeUnknownEither(InputSchema)(input);
};

/**
 * Validates and sanitizes generic user input by trimming, removing HTML tags (unless allowed),
 * normalizing whitespace, and removing dangerous patterns to prevent XSS and basic injection flaws.
 *
 * @param input - User input to validate and sanitize.
 * @param maxLength - Maximum allowed input length. Excess will be truncated.
 * @param allowHtml - If true, HTML tags are preserved; otherwise, all tags are stripped.
 * @returns Sanitized input string with length at most `maxLength`.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * validateUserInput('<p>Hello!</p>', 50); // "Hello!"
 * validateUserInput('<script>alert(1)</script>test', 100); // "test"
 * ```
 */
export const validateUserInput = (input: string, maxLength = 500, allowHtml = false): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const result = validateUserInputEffect(input, { maxLength, allowHtml });
  return Either.isRight(result) ? result.right : '';
};

/**
 * Safely parses JSON with Effect Schema validation and prototype pollution protection.
 *
 * @template A - The expected schema type
 * @param jsonString - The JSON string to parse.
 * @param schema - Effect Schema to validate against.
 * @returns Option containing the parsed and validated object.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const UserSchema = S.Struct({ name: S.String, age: S.Number });
 * const result = parseJsonWithSchema('{"name":"John","age":30}', UserSchema);
 * // Option.some({ name: 'John', age: 30 })
 * ```
 */
export const parseJsonWithSchema = <A, I>(
  jsonString: string,
  schema: S.Schema<A, I>,
): Option.Option<A> => {
  if (!jsonString || typeof jsonString !== 'string') {
    return Option.none();
  }

  try {
    // Remove potential executable code patterns
    const sanitized = jsonString
      .replace(/\)\s*\{/g, ') {}')
      .replace(/\]\s*\{/g, '] {}')
      .replace(/\}\s*\{/g, '} {}');

    const parsed = JSON.parse(sanitized);

    // Prevent prototype pollution
    if (typeof parsed === 'object' && parsed !== null) {
      const dangerous = ['__proto__', 'constructor', 'prototype'];
      for (const key of dangerous) {
        if (key in parsed) {
          delete parsed[key];
        }
      }
    }

    // Validate with Effect Schema
    const result = S.decodeUnknownEither(schema)(parsed);
    return Either.isRight(result) ? Option.some(result.right) : Option.none();
  } catch {
    return Option.none();
  }
};

/**
 * Sanitizes and safely parses a JSON string, removing suspicious syntax elements that could
 * potentially result in JSON polyglot exploits or prototype pollution.
 *
 * @template T - The expected type of the parsed object
 * @param jsonString - The JSON string to sanitize and parse.
 * @returns The parsed JavaScript object if valid, or `null` if invalid.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const obj = sanitizeJson<{ foo: string }>('{"foo":"bar"}');
 * // obj = { foo: 'bar' }
 * ```
 */
export const sanitizeJson = <T>(jsonString: string): T | null => {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    // Remove potential executable code patterns
    const sanitized = jsonString
      .replace(/\)\s*\{/g, ') {}')
      .replace(/\]\s*\{/g, '] {}')
      .replace(/\}\s*\{/g, '} {}');

    const parsed = JSON.parse(sanitized) as T;

    // Prevent prototype pollution
    if (typeof parsed === 'object' && parsed !== null) {
      const dangerous = ['__proto__', 'constructor', 'prototype'];
      for (const key of dangerous) {
        if (key in parsed) {
          delete (parsed as Record<string, unknown>)[key];
        }
      }
    }

    return parsed;
  } catch {
    return null;
  }
};

/**
 * Strips ANSI escape codes from a string.
 * Useful for cleaning terminal output before logging to files.
 *
 * @param text - The text potentially containing ANSI codes.
 * @returns The text with ANSI codes removed.
 *
 * @example
 * ```typescript
 * stripAnsi('\x1b[31mRed text\x1b[0m'); // 'Red text'
 * ```
 */
export const stripAnsi = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI codes require control characters
  return text.replace(/\x1b\[[0-9;]*m/g, '');
};

// ============================================
// PII Redaction Functions
// ============================================

/**
 * PII pattern definitions with Effect Schema validation
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const PII_PATTERNS = {
  ssn: { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, marker: '[SSN]' },
  creditCard: { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, marker: '[CREDIT_CARD]' },
  creditCardAlt: { pattern: /\b\d{15,16}\b/g, marker: '[CREDIT_CARD]' },
  email: { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, marker: '[EMAIL]' },
  phone: { pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, marker: '[PHONE]' },
  ipv4: { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, marker: '[IP_ADDRESS]' },
  ipv6: { pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, marker: '[IP_ADDRESS]' },
  date: {
    pattern: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
    marker: '[DATE]',
  },
} as const;

/**
 * Redacts PII from text using Effect Schema validated options.
 *
 * @param text - The text to redact PII from.
 * @param options - Configuration options for redaction.
 * @returns Either containing redacted text or parse error.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
export const redactPIIEffect = (
  text: string,
  options: PIIRedactionOptions = {},
): Either.Either<string, ParseResult.ParseError> => {
  const validatedOptions = S.decodeUnknownEither(PIIRedactionOptionsSchema)(options);

  if (Either.isLeft(validatedOptions)) {
    return Either.left(validatedOptions.left);
  }

  const {
    redactEmails = true,
    redactPhones = true,
    redactSSN = true,
    redactCreditCards = true,
    redactIPs = true,
    redactDates = false,
  } = validatedOptions.right;

  let result = text;

  if (redactSSN) {
    result = result.replace(PII_PATTERNS.ssn.pattern, PII_PATTERNS.ssn.marker);
  }

  if (redactCreditCards) {
    result = result.replace(PII_PATTERNS.creditCard.pattern, PII_PATTERNS.creditCard.marker);
    result = result.replace(PII_PATTERNS.creditCardAlt.pattern, PII_PATTERNS.creditCardAlt.marker);
  }

  if (redactEmails) {
    result = result.replace(PII_PATTERNS.email.pattern, PII_PATTERNS.email.marker);
  }

  if (redactPhones) {
    result = result.replace(PII_PATTERNS.phone.pattern, PII_PATTERNS.phone.marker);
  }

  if (redactIPs) {
    result = result.replace(PII_PATTERNS.ipv4.pattern, PII_PATTERNS.ipv4.marker);
    result = result.replace(PII_PATTERNS.ipv6.pattern, PII_PATTERNS.ipv6.marker);
  }

  if (redactDates) {
    result = result.replace(PII_PATTERNS.date.pattern, PII_PATTERNS.date.marker);
  }

  return Either.right(result);
};

/**
 * Redacts common PII patterns in a string for safe logging.
 * Detects and masks SSNs, credit cards, emails, phone numbers, etc.
 *
 * @param text - The text to redact PII from.
 * @param options - Configuration options for redaction.
 * @returns The text with PII patterns replaced with redaction markers.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 *
 * @example
 * ```typescript
 * redactPII('Contact john@example.com or call 555-123-4567');
 * // 'Contact [EMAIL] or call [PHONE]'
 *
 * redactPII('SSN: 123-45-6789');
 * // 'SSN: [SSN]'
 * ```
 */
export const redactPII = (
  text: string,
  options: {
    redactEmails?: boolean;
    redactPhones?: boolean;
    redactSSN?: boolean;
    redactCreditCards?: boolean;
    redactIPs?: boolean;
    customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
  } = {},
): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const {
    redactEmails = true,
    redactPhones = true,
    redactSSN = true,
    redactCreditCards = true,
    redactIPs = true,
    customPatterns = [],
  } = options;

  const result = redactPIIEffect(text, {
    redactEmails,
    redactPhones,
    redactSSN,
    redactCreditCards,
    redactIPs,
  });

  let output = Either.isRight(result) ? result.right : text;

  // Apply custom patterns
  for (const { pattern, replacement } of customPatterns) {
    output = output.replace(pattern, replacement);
  }

  return output;
};

/**
 * Creates a safe string representation of an object for logging,
 * automatically redacting sensitive fields.
 *
 * @param obj - The object to stringify.
 * @param sensitiveKeys - Array of key names to redact.
 * @param indent - JSON indentation (default: 2).
 * @returns A JSON string with sensitive values redacted.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 *
 * @example
 * ```typescript
 * safeStringify({ user: 'john', password: 'secret123' }, ['password']);
 * // '{\n  "user": "john",\n  "password": "[REDACTED]"\n}'
 * ```
 */
export const safeStringify = (
  obj: unknown,
  sensitiveKeys: string[] = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'ssn',
    'creditCard',
  ],
  indent = 2,
): string => {
  const sensitiveKeysLower = sensitiveKeys.map((k) => k.toLowerCase());

  const replacer = (_key: string, value: unknown): unknown => {
    if (_key && sensitiveKeysLower.includes(_key.toLowerCase())) {
      return '[REDACTED]';
    }
    return value;
  };

  try {
    return JSON.stringify(obj, replacer, indent);
  } catch {
    return '[Unable to stringify object]';
  }
};

// ============================================
// Validation Helpers
// ============================================

/**
 * Validates if a string is a valid email address using Effect Schema.
 *
 * @param email - The string to validate.
 * @returns true if valid email, false otherwise.
 */
export const isValidEmail = (email: string): boolean => {
  return Either.isRight(S.decodeUnknownEither(EmailSchema)(email));
};

/**
 * Validates if a string is a valid phone number using Effect Schema.
 *
 * @param phone - The string to validate.
 * @returns true if valid phone number, false otherwise.
 */
export const isValidPhone = (phone: string): boolean => {
  return Either.isRight(S.decodeUnknownEither(PhoneNumberSchema)(phone));
};

/**
 * Validates if a string is a valid SSN using Effect Schema.
 *
 * @param ssn - The string to validate.
 * @returns true if valid SSN, false otherwise.
 */
export const isValidSSN = (ssn: string): boolean => {
  return Either.isRight(S.decodeUnknownEither(SSNSchema)(ssn));
};

/**
 * Validates if a string is a safe URL using Effect Schema.
 *
 * @param url - The string to validate.
 * @returns true if valid and safe URL, false otherwise.
 */
export const isValidUrl = (url: string): boolean => {
  return Either.isRight(S.decodeUnknownEither(SafeUrlSchema)(url));
};
