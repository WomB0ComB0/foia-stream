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
 * @file Fetcher utility tests
 * @module tests/utils/fetcher
 * @author FOIA Stream Team
 */

import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  createApiResponseSchema,
  createPaginatedSchema,
  FetcherError,
  ValidationError,
} from '../../src/utils/fetcher';

describe('FetcherError', () => {
  describe('constructor', () => {
    it('should create error with message and url', () => {
      const error = new FetcherError('Request failed', '/api/test');
      expect(error.message).toBe('Request failed');
      expect(error.url).toBe('/api/test');
      expect(error.name).toBe('FetcherError');
    });

    it('should include status code', () => {
      const error = new FetcherError('Not found', '/api/test', 404);
      expect(error.status).toBe(404);
    });

    it('should include response data', () => {
      const responseData = { error: 'Not found', code: 'RESOURCE_NOT_FOUND' };
      const error = new FetcherError('Not found', '/api/test', 404, responseData);
      expect(error.responseData).toEqual(responseData);
    });

    it('should include attempt number', () => {
      const error = new FetcherError('Timeout', '/api/test', undefined, undefined, 3);
      expect(error.attempt).toBe(3);
    });
  });

  describe('toString', () => {
    it('should format error message with url', () => {
      const error = new FetcherError('Request failed', '/api/users');
      expect(error.toString()).toBe('FetcherError: Request failed (URL: /api/users)');
    });

    it('should include status in string', () => {
      const error = new FetcherError('Server error', '/api/data', 500);
      expect(error.toString()).toContain('Status: 500');
    });

    it('should include attempt in string', () => {
      const error = new FetcherError('Timeout', '/api/data', undefined, undefined, 2);
      expect(error.toString()).toContain('Attempt: 2');
    });

    it('should include all info when available', () => {
      const error = new FetcherError('Failed', '/api/test', 503, { error: 'test' }, 3);
      const str = error.toString();
      expect(str).toContain('/api/test');
      expect(str).toContain('503');
      expect(str).toContain('3');
    });
  });

  describe('instanceof', () => {
    it('should be instanceof Error', () => {
      const error = new FetcherError('test', '/api');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof FetcherError', () => {
      const error = new FetcherError('test', '/api');
      expect(error).toBeInstanceOf(FetcherError);
    });
  });

  describe('Symbol.toStringTag', () => {
    it('should have correct toStringTag', () => {
      const error = new FetcherError('test', '/api');
      expect(error[Symbol.toStringTag]).toBe('FetcherError');
    });
  });
});

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create error with message, url, and problems', () => {
      const error = new ValidationError(
        'Validation failed',
        '/api/users',
        'Expected string, got number',
        { id: 123 },
      );
      expect(error.message).toBe('Validation failed');
      expect(error.url).toBe('/api/users');
      expect(error.problems).toBe('Expected string, got number');
      expect(error.responseData).toEqual({ id: 123 });
      expect(error.name).toBe('ValidationError');
    });

    it('should include attempt number', () => {
      const error = new ValidationError('Failed', '/api', 'problems', {}, 2);
      expect(error.attempt).toBe(2);
    });
  });

  describe('toString', () => {
    it('should format error message', () => {
      const error = new ValidationError('Validation failed', '/api/test', 'type mismatch', {});
      expect(error.toString()).toContain('ValidationError');
      expect(error.toString()).toContain('/api/test');
    });

    it('should include attempt when present', () => {
      const error = new ValidationError('Failed', '/api', 'problems', {}, 3);
      expect(error.toString()).toContain('Attempt: 3');
    });
  });

  describe('getProblemsString', () => {
    it('should return problems string', () => {
      const problems = 'Field "name" is required\nField "email" must be a valid email';
      const error = new ValidationError('Validation failed', '/api', problems, {});
      expect(error.getProblemsString()).toBe(problems);
    });
  });

  describe('instanceof', () => {
    it('should be instanceof Error', () => {
      const error = new ValidationError('test', '/api', '', {});
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof ValidationError', () => {
      const error = new ValidationError('test', '/api', '', {});
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should NOT be instanceof FetcherError', () => {
      const error = new ValidationError('test', '/api', '', {});
      expect(error).not.toBeInstanceOf(FetcherError);
    });
  });

  describe('Symbol.toStringTag', () => {
    it('should have correct toStringTag', () => {
      const error = new ValidationError('test', '/api', '', {});
      expect(error[Symbol.toStringTag]).toBe('ValidationError');
    });
  });
});

describe('createPaginatedSchema', () => {
  const UserSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String,
  });

  const PaginatedUsersSchema = createPaginatedSchema(UserSchema);

  it('should create a valid paginated schema', () => {
    const validData = {
      data: [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
    };

    const result = Schema.decodeUnknownEither(PaginatedUsersSchema)(validData);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right.data).toHaveLength(2);
      expect(result.right.pagination.page).toBe(1);
    }
  });

  it('should reject invalid data items', () => {
    const invalidData = {
      data: [{ id: 'not-a-number', name: 'John' }], // missing email, wrong id type
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    };

    const result = Schema.decodeUnknownEither(PaginatedUsersSchema)(invalidData);
    expect(result._tag).toBe('Left');
  });

  it('should reject invalid pagination', () => {
    const invalidData = {
      data: [],
      pagination: {
        page: 'one', // should be number
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    };

    const result = Schema.decodeUnknownEither(PaginatedUsersSchema)(invalidData);
    expect(result._tag).toBe('Left');
  });

  it('should reject missing pagination fields', () => {
    const invalidData = {
      data: [],
      pagination: {
        page: 1,
        // missing other fields
      },
    };

    const result = Schema.decodeUnknownEither(PaginatedUsersSchema)(invalidData);
    expect(result._tag).toBe('Left');
  });
});

describe('createApiResponseSchema', () => {
  const DataSchema = Schema.Struct({
    id: Schema.Number,
    value: Schema.String,
  });

  const ResponseSchema = createApiResponseSchema(DataSchema);

  it('should create a valid API response schema', () => {
    const validResponse = {
      success: true,
      data: { id: 1, value: 'test' },
    };

    const result = Schema.decodeUnknownEither(ResponseSchema)(validResponse);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right.success).toBe(true);
      expect(result.right.data.id).toBe(1);
    }
  });

  it('should accept optional message', () => {
    const response = {
      success: true,
      data: { id: 1, value: 'test' },
      message: 'Operation completed successfully',
    };

    const result = Schema.decodeUnknownEither(ResponseSchema)(response);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right.message).toBe('Operation completed successfully');
    }
  });

  it('should accept optional errors array', () => {
    const response = {
      success: false,
      data: { id: 0, value: '' },
      errors: ['Field required', 'Invalid format'],
    };

    const result = Schema.decodeUnknownEither(ResponseSchema)(response);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right.errors).toEqual(['Field required', 'Invalid format']);
    }
  });

  it('should reject invalid data', () => {
    const invalidResponse = {
      success: true,
      data: { id: 'not-a-number', value: 123 },
    };

    const result = Schema.decodeUnknownEither(ResponseSchema)(invalidResponse);
    expect(result._tag).toBe('Left');
  });

  it('should reject missing success field', () => {
    const invalidResponse = {
      data: { id: 1, value: 'test' },
    };

    const result = Schema.decodeUnknownEither(ResponseSchema)(invalidResponse);
    expect(result._tag).toBe('Left');
  });
});

describe('Error handling patterns', () => {
  it('should distinguish between FetcherError and ValidationError', () => {
    const fetcherError = new FetcherError('Network error', '/api');
    const validationError = new ValidationError('Invalid data', '/api', 'type mismatch', {});

    const handleError = (error: FetcherError | ValidationError): string => {
      if (error instanceof ValidationError) {
        return `Validation: ${error.getProblemsString()}`;
      }
      return `Fetch: ${error.status ?? 'unknown'}`;
    };

    expect(handleError(fetcherError)).toBe('Fetch: unknown');
    expect(handleError(validationError)).toBe('Validation: type mismatch');
  });

  it('should preserve error chain information', () => {
    const fetcherError = new FetcherError(
      'Request failed after retries',
      '/api/data',
      503,
      { retryAfter: 60 },
      3,
    );

    expect(fetcherError.url).toBe('/api/data');
    expect(fetcherError.status).toBe(503);
    expect(fetcherError.responseData).toEqual({ retryAfter: 60 });
    expect(fetcherError.attempt).toBe(3);
  });
});

describe('FOIA API scenarios', () => {
  it('should handle FOIA request response validation', () => {
    const FOIARequestSchema = Schema.Struct({
      id: Schema.String,
      status: Schema.Literal('pending', 'processing', 'completed', 'denied'),
      submittedAt: Schema.String,
      agency: Schema.Struct({
        id: Schema.String,
        name: Schema.String,
      }),
    });

    const ResponseSchema = createApiResponseSchema(FOIARequestSchema);

    const validResponse = {
      success: true,
      data: {
        id: 'FOIA-2025-001',
        status: 'pending',
        submittedAt: '2025-01-15T10:30:00Z',
        agency: {
          id: 'FBI',
          name: 'Federal Bureau of Investigation',
        },
      },
    };

    const result = Schema.decodeUnknownEither(ResponseSchema)(validResponse);
    expect(result._tag).toBe('Right');
  });

  it('should handle paginated FOIA requests', () => {
    const FOIARequestSummarySchema = Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      status: Schema.String,
    });

    const PaginatedSchema = createPaginatedSchema(FOIARequestSummarySchema);

    const paginatedResponse = {
      data: [
        { id: '001', title: 'Request 1', status: 'pending' },
        { id: '002', title: 'Request 2', status: 'completed' },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      },
    };

    const result = Schema.decodeUnknownEither(PaginatedSchema)(paginatedResponse);
    expect(result._tag).toBe('Right');
    if (result._tag === 'Right') {
      expect(result.right.data).toHaveLength(2);
      expect(result.right.pagination.totalPages).toBe(3);
    }
  });

  it('should create meaningful validation errors for FOIA data', () => {
    const invalidFOIAData = {
      id: 123, // should be string
      status: 'unknown', // invalid status
    };

    const error = new ValidationError(
      'FOIA request validation failed',
      '/api/foia/requests',
      'id: Expected string, got number\nstatus: Expected one of pending|processing|completed|denied',
      invalidFOIAData,
      1,
    );

    expect(error.getProblemsString()).toContain('id');
    expect(error.getProblemsString()).toContain('status');
    expect(error.responseData).toEqual(invalidFOIAData);
  });
});
