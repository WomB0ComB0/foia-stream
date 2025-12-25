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
 * @file Base Error Classes with Effect Integration
 * @module utils/errors
 * @author FOIA Stream Team
 * @description Provides structured error handling with rich context, making errors
 *              easier to track, debug, and handle throughout the application.
 *              Includes specialized errors for HTTP responses, validation, and security.
 * @compliance NIST 800-53 SI-11 (Error Handling)
 */

import { Data, type ParseResult, Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Error Metadata Schema
 */
const ErrorMetadataSchema = S.Record({ key: S.String, value: S.Unknown });

export type ErrorMetadata = typeof ErrorMetadataSchema.Type;

/**
 * Serialized Error Schema
 */
const SerializedErrorSchema = S.Struct({
  name: S.String,
  message: S.String,
  stack: S.optional(S.String),
});

export type SerializedError = typeof SerializedErrorSchema.Type;

/**
 * Base Error JSON Schema
 */
const BaseErrorJSONSchema = S.Struct({
  name: S.String,
  message: S.String,
  command: S.String,
  cause: SerializedErrorSchema,
  metadata: S.optional(ErrorMetadataSchema),
  timestamp: S.Number,
  stack: S.optional(S.String),
});

export type BaseErrorJSON = typeof BaseErrorJSONSchema.Type;

/**
 * Aggregate Error Options Schema
 */
const AggregateErrorOptionsSchema = S.Struct({
  command: S.String,
  message: S.optional(S.String),
  metadata: S.optional(ErrorMetadataSchema),
});

export type AggregateErrorOptions = typeof AggregateErrorOptionsSchema.Type;

// ============================================
// Base Error Class
// ============================================

/**
 * Represents a base error class with enhanced error reporting capabilities.
 *
 * This class extends Effect's `Data.TaggedError` to provide a structured approach
 * to error handling with rich context, making errors easier to track, debug, and
 * handle throughout your application.
 *
 * @example
 * // Basic usage
 * try {
 *   await database.query('SELECT * FROM users');
 * } catch (error) {
 *   throw new BaseError(error as Error, 'database:query');
 * }
 *
 * @example
 * // With metadata
 * try {
 *   const result = await apiCall();
 * } catch (error) {
 *   throw new BaseError(error as Error, 'api:fetch', {
 *     endpoint: '/users',
 *     method: 'GET'
 *   });
 * }
 */
export class BaseError extends Data.TaggedError('BaseError')<{
  cause: Error;
  command: string;
  parseResult?: ParseResult.ParseError;
  metadata?: Record<string, unknown>;
  timestamp: number;
}> {
  /**
   * Creates a new BaseError instance.
   *
   * @param cause - The original error that caused this error
   * @param command - The command identifier for context (e.g., "user:create", "database:connect")
   * @param metadata - Optional additional context information
   */
  constructor(cause: Error, command: string, metadata: Record<string, unknown> = {}) {
    super({
      cause,
      command,
      metadata,
      timestamp: Date.now(),
    });
    this.name = this._tag;
  }

  /**
   * Converts the error to a human-readable string representation.
   */
  public override toString(): string {
    const date = new Date(this.timestamp).toISOString();
    return `
${this.name}: ${this.cause.message} (Command: ${this.command})
Timestamp: ${date}${
      this.metadata && Object.keys(this.metadata).length > 0
        ? `
Metadata: ${JSON.stringify(this.metadata, null, 2)}`
        : ''
    }
    `.trim();
  }

  /**
   * Serializes the error to a JSON-compatible object.
   */
  public override toJSON(): BaseErrorJSON {
    return {
      name: this.name,
      message: this.cause.message,
      command: this.command,
      cause: {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      },
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.cause.stack,
    };
  }

  /**
   * Custom Node.js inspection method for better console output.
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.toString();
  }

  /**
   * Returns a string representation for string coercion.
   */
  get [Symbol.toStringTag](): string {
    return this.name;
  }

  /**
   * Returns a primitive value representation of the error.
   */
  [Symbol.toPrimitive](hint: 'string' | 'number' | 'default'): string | number {
    if (hint === 'number') {
      return this.timestamp;
    }
    return this.toString();
  }

  /**
   * Returns an array of key-value pairs representing error properties.
   */
  public entries(): Array<[string, unknown]> {
    const result: Array<[string, unknown]> = [
      ['name', this.name],
      ['message', this.cause.message],
      ['command', this.command],
      ['timestamp', this.timestamp],
    ];

    if (this.metadata) {
      result.push(['metadata', this.metadata]);
    }
    if (this.parseResult) {
      result.push(['parseResult', this.parseResult]);
    }
    result.push(['cause', this.cause]);

    return result;
  }

  /**
   * Checks if this error was caused by a specific error type.
   */
  public isCausedBy<T extends Error>(errorType: new (...args: unknown[]) => T): boolean {
    return this.cause instanceof errorType;
  }

  /**
   * Checks if the error occurred during a specific command or command pattern.
   */
  public isCommand(pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return this.command === pattern;
    }
    return pattern.test(this.command);
  }

  /**
   * Attaches additional metadata to the error.
   */
  public withMetadata(key: string, value: unknown): this {
    if (!this.metadata) {
      (this as { metadata?: Record<string, unknown> }).metadata = {};
    }
    const meta = this.metadata as Record<string, unknown>;
    meta[key] = value;
    return this;
  }

  /**
   * Creates a new error with the same properties but a different command.
   */
  public withCommand(newCommand: string): BaseError {
    const newError = new BaseError(this.cause, newCommand, this.metadata);
    if (this.parseResult) {
      (newError as { parseResult?: ParseResult.ParseError }).parseResult = this.parseResult;
    }
    return newError;
  }
}

// ============================================
// HTTP Error Classes
// ============================================

/**
 * HTTP Error with status code
 */
export class HttpError extends Data.TaggedError('HttpError')<{
  statusCode: number;
  message: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
  timestamp: number;
}> {
  constructor(
    statusCode: number,
    message: string,
    options?: { cause?: Error; metadata?: Record<string, unknown> },
  ) {
    super({
      statusCode,
      message,
      cause: options?.cause,
      metadata: options?.metadata,
      timestamp: Date.now(),
    });
  }

  public override toString(): string {
    return `HttpError [${this.statusCode}]: ${this.message}`;
  }

  public override toJSON() {
    return {
      name: this._tag,
      statusCode: this.statusCode,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Pre-defined HTTP errors
 */
export const BadRequestError = (message: string, metadata?: Record<string, unknown>) =>
  new HttpError(400, message, { metadata });

export const UnauthorizedError = (message = 'Unauthorized', metadata?: Record<string, unknown>) =>
  new HttpError(401, message, { metadata });

export const ForbiddenError = (message = 'Forbidden', metadata?: Record<string, unknown>) =>
  new HttpError(403, message, { metadata });

export const NotFoundError = (message = 'Not found', metadata?: Record<string, unknown>) =>
  new HttpError(404, message, { metadata });

export const ConflictError = (message: string, metadata?: Record<string, unknown>) =>
  new HttpError(409, message, { metadata });

export const TooManyRequestsError = (
  message = 'Too many requests',
  metadata?: Record<string, unknown>,
) => new HttpError(429, message, { metadata });

export const InternalServerError = (
  message = 'Internal server error',
  metadata?: Record<string, unknown>,
) => new HttpError(500, message, { metadata });

// ============================================
// Domain-Specific Error Classes
// ============================================

/**
 * Validation Error
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  field: string;
  message: string;
  value?: unknown;
  parseResult?: ParseResult.ParseError;
  timestamp: number;
}> {
  constructor(
    field: string,
    message: string,
    options?: { value?: unknown; parseResult?: ParseResult.ParseError },
  ) {
    super({
      field,
      message,
      value: options?.value,
      parseResult: options?.parseResult,
      timestamp: Date.now(),
    });
  }

  public override toString(): string {
    return `ValidationError: ${this.field} - ${this.message}`;
  }

  public override toJSON() {
    return {
      name: this._tag,
      field: this.field,
      message: this.message,
      value: this.value,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Database Error
 */
export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  operation: string;
  table?: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
  timestamp: number;
}> {
  constructor(
    operation: string,
    options?: { table?: string; cause?: Error; metadata?: Record<string, unknown> },
  ) {
    super({
      operation,
      table: options?.table,
      cause: options?.cause,
      metadata: options?.metadata,
      timestamp: Date.now(),
    });
  }

  public override toString(): string {
    const table = this.table ? ` on ${this.table}` : '';
    return `DatabaseError: ${this.operation}${table}`;
  }
}

/**
 * Security Error
 */
export class SecurityError extends Data.TaggedError('SecurityError')<{
  type:
    | 'authentication'
    | 'authorization'
    | 'rate_limit'
    | 'ban'
    | 'invalid_token'
    | 'expired_token';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}> {
  constructor(type: SecurityError['type'], message: string, metadata?: Record<string, unknown>) {
    super({
      type,
      message,
      metadata,
      timestamp: Date.now(),
    });
  }

  public override toString(): string {
    return `SecurityError [${this.type}]: ${this.message}`;
  }

  public override toJSON() {
    return {
      name: this._tag,
      type: this.type,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp,
    };
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Creates a new tagged error class factory for custom error types.
 */
export const createTaggedError = <T extends string>(name: T) => Data.TaggedError(name);

/**
 * Type guard to check if an error is a BaseError instance.
 */
export const isBaseError = (error: unknown): error is BaseError => {
  return error instanceof BaseError;
};

/**
 * Type guard to check if an error is an HttpError instance.
 */
export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof HttpError;
};

/**
 * Wraps an unknown error in a BaseError if it isn't already one.
 */
export const ensureBaseError = (
  error: unknown,
  command: string,
  metadata?: Record<string, unknown>,
): BaseError => {
  if (isBaseError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseError(error, command, metadata);
  }

  return new BaseError(new Error(String(error)), command, metadata);
};

/**
 * Creates a BaseError from an Effect ParseResult.ParseError.
 */
export const fromParseError = (
  parseError: ParseResult.ParseError,
  command: string,
  metadata?: Record<string, unknown>,
): BaseError => {
  const error = new BaseError(new Error('Parse error'), command, metadata);
  (error as { parseResult?: ParseResult.ParseError }).parseResult = parseError;
  return error;
};

/**
 * Aggregates multiple errors into a single BaseError.
 */
export const aggregateErrors = (errors: Error[], options: AggregateErrorOptions): BaseError => {
  const message = options.message || `${errors.length} errors occurred`;
  const aggregateError = new Error(message);

  const metadata = {
    ...options.metadata,
    errorCount: errors.length,
    errors: errors.map((e) => ({
      name: e.name,
      message: e.message,
      stack: e.stack,
    })),
  };

  return new BaseError(aggregateError, options.command, metadata);
};

/**
 * Converts any error to an HTTP-friendly response object
 */
export const toHttpResponse = (
  error: unknown,
): { status: number; body: Record<string, unknown> } => {
  if (isHttpError(error)) {
    return {
      status: error.statusCode,
      body: error.toJSON(),
    };
  }

  if (isBaseError(error)) {
    return {
      status: 500,
      body: error.toJSON(),
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        name: 'Error',
        message: error.message,
        timestamp: Date.now(),
      },
    };
  }

  return {
    status: 500,
    body: {
      name: 'UnknownError',
      message: String(error),
      timestamp: Date.now(),
    },
  };
};

// ============================================
// Schema Exports
// ============================================

export {
  AggregateErrorOptionsSchema,
  BaseErrorJSONSchema,
  ErrorMetadataSchema,
  SerializedErrorSchema,
};

// Re-export Effect types for convenience
export type { ParseResult } from 'effect';
