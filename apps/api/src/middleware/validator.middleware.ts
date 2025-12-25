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
 * @file Effect Schema Validator Middleware
 * @module middleware/validator
 * @author FOIA Stream Team
 * @description Provides Hono middleware for validating request data using Effect Schema.
 *              Similar to @hono/zod-validator but uses Effect Schema for validation.
 *              Integrates with structured error handling from @foia-stream/shared.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

// ============================================
// FOIA Stream - Effect Schema Validator Middleware
// ============================================

import { ValidationError } from '@foia-stream/shared';
import { ParseResult, Schema as S } from 'effect';
import { validator } from 'hono/validator';

/** Supported validation targets for request data */
type ValidationTarget = 'json' | 'query' | 'param' | 'header' | 'form';

/**
 * Format Effect Schema parse errors into readable messages
 *
 * @function formatSchemaError
 * @param {ParseResult.ParseError} error - The parse error from Effect Schema
 * @returns {string} Human-readable error message
 */
function formatSchemaError(error: ParseResult.ParseError): string {
  const message = ParseResult.TreeFormatter.formatErrorSync(error);
  return message || 'Validation failed';
}

/**
 * Extract field name from parse error if possible
 *
 * @function extractFieldFromError
 * @param {ParseResult.ParseError} error - The parse error
 * @returns {string} Field name or 'unknown' if not extractable
 */
function extractFieldFromError(error: ParseResult.ParseError): string {
  const message = formatSchemaError(error);
  // Try to extract field name from error message patterns like "path: [fieldName]"
  const match = message.match(/└─ \["?([^"|\]]+)"?\]/);
  return match?.[1] || 'unknown';
}

/**
 * Create a ValidationError from Effect ParseResult.ParseError
 *
 * @function createValidationError
 * @param {ParseResult.ParseError} parseError - The parse error
 * @param {unknown} [value] - The original value that failed validation
 * @returns {ValidationError} Structured validation error
 */
function createValidationError(
  parseError: ParseResult.ParseError,
  value?: unknown,
): ValidationError {
  const field = extractFieldFromError(parseError);
  const message = formatSchemaError(parseError);
  return new ValidationError(field, message, { value, parseResult: parseError });
}

/**
 * Effect Schema validator middleware for Hono
 *
 * @function effectValidator
 * @template T - The decoded output type
 * @template I - The encoded input type
 * @template Target - The validation target type
 * @param {Target} target - Where to validate ('json', 'query', 'param', 'header', 'form')
 * @param {S.Schema<T, I>} schema - Effect Schema to validate against
 * @returns {MiddlewareHandler} Hono middleware that validates and transforms input
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 *
 * @example
 * ```typescript
 * const CreateUserSchema = S.Struct({
 *   email: S.String.pipe(S.pattern(/^[^@]+@[^@]+$/)),
 *   name: S.String.pipe(S.minLength(1))
 * });
 *
 * app.post('/users', effectValidator('json', CreateUserSchema), (c) => {
 *   const data = c.req.valid('json'); // Typed as CreateUserSchema output
 *   // ...
 * });
 * ```
 */
export function effectValidator<T, I, Target extends ValidationTarget>(
  target: Target,
  schema: S.Schema<T, I>,
) {
  return validator(target, async (value, c) => {
    const result = S.decodeUnknownEither(schema)(value);

    if (result._tag === 'Left') {
      const validationError = createValidationError(result.left, value);
      return c.json(
        {
          success: false,
          error: validationError._tag,
          field: validationError.field,
          message: validationError.message,
          timestamp: validationError.timestamp,
        },
        400,
      );
    }

    return result.right as T;
  });
}

/**
 * Validate JSON body with Effect Schema
 *
 * @function jsonValidator
 * @template T - The decoded output type
 * @template I - The encoded input type
 * @param {S.Schema<T, I>} schema - Effect Schema to validate against
 * @returns {MiddlewareHandler} Hono middleware
 *
 * @example
 * ```typescript
 * app.post('/users', jsonValidator(CreateUserSchema), handler);
 * ```
 */
export function jsonValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('json', schema);
}

/**
 * Validate query parameters with Effect Schema
 *
 * @function queryValidator
 * @template T - The decoded output type
 * @template I - The encoded input type
 * @param {S.Schema<T, I>} schema - Effect Schema to validate against
 * @returns {MiddlewareHandler} Hono middleware
 */
export function queryValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('query', schema);
}

/**
 * Validate URL parameters with Effect Schema
 *
 * @function paramValidator
 * @template T - The decoded output type
 * @template I - The encoded input type
 * @param {S.Schema<T, I>} schema - Effect Schema to validate against
 * @returns {MiddlewareHandler} Hono middleware
 */
export function paramValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('param', schema);
}

/**
 * Validate header parameters with Effect Schema
 *
 * @function headerValidator
 * @template T - The decoded output type
 * @template I - The encoded input type
 * @param {S.Schema<T, I>} schema - Effect Schema to validate against
 * @returns {MiddlewareHandler} Hono middleware
 */
export function headerValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('header', schema);
}

/**
 * Validate form data with Effect Schema
 */
export function formValidator<T, I>(schema: S.Schema<T, I>) {
  return effectValidator('form', schema);
}

/**
 * Type helper to extract the validated type from a schema
 */
export type InferSchema<T> = T extends S.Schema<infer A, unknown> ? A : never;

// Re-export error utilities for convenience
export {
  BadRequestError,
  fromParseError,
  toHttpResponse,
  ValidationError,
} from '@foia-stream/shared';
