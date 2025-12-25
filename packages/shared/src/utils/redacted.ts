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
 * @file Redacted value wrapper for sensitive data protection
 * @module @foia-stream/shared/utils/redacted
 * @author FOIA Stream Team
 * @compliance NIST 800-53 SI-11 (Error Handling), AU-3 (Content of Audit Records)
 */

/**
 * The string marker shown in stringification/serialization for redacted values.
 * @constant
 */
export const REDACTED_MARKER = '[REDACTED]';

/**
 * A utility class representing a sensitive value that should be redacted when serialized, logged, or inspected.
 *
 * The `Redacted` class encapsulates a value and prevents its accidental exposure via stringification, serialization,
 * or inspection. All such operations will yield the `[REDACTED]` marker instead of the real value.
 * The true value can only be retrieved intentionally via `getValue()` or `valueOf()`.
 *
 * @template T - The type of the underlying value
 * @class
 * @compliance NIST 800-53 AU-3 (Content of Audit Records) - Prevents sensitive data in logs
 *
 * @example
 * ```typescript
 * // Create a redacted value
 * const secret = Redacted.make('mypassword');
 * console.log(secret.toString()); // '[REDACTED]'
 * console.log(secret.getValue()); // 'mypassword'
 *
 * // JSON serialization is safe
 * JSON.stringify({ password: secret }); // '{"password":"[REDACTED]"}'
 * ```
 */
export class Redacted<T = string> {
  /**
   * The actual sensitive value.
   * @private
   * @readonly
   */
  private readonly _value: T;

  /**
   * Constructs a new Redacted instance with the provided value after validation.
   *
   * @param value - The value to be securely redacted.
   * @throws {Error} If the value is null or undefined.
   * @private
   */
  private constructor(value: T) {
    this.validateValue(value);
    this._value = value;
  }

  /**
   * Validates the value to ensure it is neither null nor undefined.
   *
   * @param value - The value to validate.
   * @throws {Error} If the value is null or undefined.
   * @private
   */
  private validateValue(value: T): void {
    if (value === null || value === undefined) {
      throw new Error('Redacted value cannot be null or undefined');
    }
  }

  /**
   * Factory method to create a new Redacted instance.
   *
   * @template T
   * @param value - The value to redact.
   * @returns The redacted wrapper for the value.
   * @throws {Error} If the value is null or undefined.
   *
   * @example
   * ```typescript
   * const apiKey = Redacted.make('sk-secret-key-12345');
   * const ssn = Redacted.make('123-45-6789');
   * ```
   */
  public static make<T>(value: T): Redacted<T> {
    return new Redacted(value);
  }

  /**
   * Returns the underlying sensitive value.
   * Use with caution - only when the actual value is truly needed.
   *
   * @returns The original value.
   */
  public getValue(): T {
    return this._value;
  }

  /**
   * Returns a string representing the redacted value for logging or display.
   *
   * @returns The redaction marker "[REDACTED]".
   */
  public toString(): string {
    return REDACTED_MARKER;
  }

  /**
   * Returns a string for JSON serialization, always as "[REDACTED]".
   * This prevents accidental exposure when objects containing Redacted values are serialized.
   *
   * @returns The redaction marker "[REDACTED]".
   */
  public toJSON(): string {
    return REDACTED_MARKER;
  }

  /**
   * Custom inspect implementation for Node.js util.inspect, displaying "[REDACTED]".
   *
   * @returns The redaction marker "[REDACTED]".
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return REDACTED_MARKER;
  }

  /**
   * Returns a string for manual inspection, always "[REDACTED]".
   *
   * @returns The redaction marker "[REDACTED]".
   */
  public inspect(): string {
    return REDACTED_MARKER;
  }

  /**
   * Compares this instance with another Redacted instance for equality of values.
   *
   * @param other - The other instance to compare.
   * @returns True if underlying values are equal, else false.
   *
   * @example
   * ```typescript
   * const a = Redacted.make('secret');
   * const b = Redacted.make('secret');
   * a.equals(b); // true
   * ```
   */
  public equals(other: Redacted<T>): boolean {
    if (!(other instanceof Redacted)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Type guard to check if a value is a Redacted instance.
   *
   * @template T
   * @param value - The value to test.
   * @returns True if value is a Redacted instance.
   *
   * @example
   * ```typescript
   * if (Redacted.isRedacted(maybeSecret)) {
   *   // TypeScript knows maybeSecret is Redacted<T>
   * }
   * ```
   */
  public static isRedacted<T>(value: unknown): value is Redacted<T> {
    return value instanceof Redacted;
  }

  /**
   * Returns the actual value for valueOf conversions.
   * Note: This allows the value to be used in comparisons but use with caution.
   *
   * @returns The underlying value.
   */
  public valueOf(): T {
    return this._value;
  }

  /**
   * Creates a redacted version of an object, wrapping specified fields.
   *
   * @template T - The object type
   * @param obj - The object to process
   * @param sensitiveFields - Array of field names to redact
   * @returns A new object with specified fields wrapped in Redacted
   *
   * @example
   * ```typescript
   * const user = { name: 'John', ssn: '123-45-6789', email: 'john@example.com' };
   * const safe = Redacted.redactFields(user, ['ssn']);
   * // safe.ssn is now Redacted<string>
   * ```
   */
  public static redactFields<T extends Record<string, unknown>>(
    obj: T,
    sensitiveFields: (keyof T)[],
  ): { [K in keyof T]: K extends (typeof sensitiveFields)[number] ? Redacted<T[K]> : T[K] } {
    const result = { ...obj } as Record<string, unknown>;

    for (const field of sensitiveFields) {
      if (field in obj && obj[field] !== null && obj[field] !== undefined) {
        result[field as string] = Redacted.make(obj[field]);
      }
    }

    return result as {
      [K in keyof T]: K extends (typeof sensitiveFields)[number] ? Redacted<T[K]> : T[K];
    };
  }
}

/**
 * Common PII field names that should typically be redacted
 * @constant
 */
export const COMMON_SENSITIVE_FIELDS = [
  'password',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'creditCardNumber',
  'cvv',
  'pin',
  'apiKey',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'privateKey',
  'dateOfBirth',
  'dob',
  'bankAccount',
  'routingNumber',
  'driverLicense',
  'passport',
] as const;

/**
 * Type for common sensitive field names
 */
export type SensitiveFieldName = (typeof COMMON_SENSITIVE_FIELDS)[number];
