/**
 * Copyright (c) 2025 Foia Stream
 */

import { describe, expect, it } from 'vitest';
import {
  aggregateErrors,
  BadRequestError,
  BaseError,
  ConflictError,
  DatabaseError,
  ensureBaseError,
  ForbiddenError,
  HttpError,
  InternalServerError,
  isBaseError,
  isHttpError,
  NotFoundError,
  SecurityError,
  TooManyRequestsError,
  toHttpResponse,
  UnauthorizedError,
  ValidationError,
} from '../../src/utils/errors';

describe('BaseError', () => {
  it('should create error with cause and command', () => {
    const cause = new Error('original error');
    const error = new BaseError(cause, 'user:create');

    expect(error.cause).toBe(cause);
    expect(error.command).toBe('user:create');
    expect(error.timestamp).toBeDefined();
  });

  it('should include metadata', () => {
    const error = new BaseError(new Error('test'), 'test:cmd', { userId: '123' });
    expect(error.metadata?.userId).toBe('123');
  });

  it('should convert to string', () => {
    const error = new BaseError(new Error('test message'), 'test:cmd');
    const str = error.toString();
    expect(str).toContain('test message');
    expect(str).toContain('test:cmd');
  });

  it('should convert to JSON', () => {
    const error = new BaseError(new Error('test'), 'test:cmd');
    const json = error.toJSON();
    expect(json.name).toBe('BaseError');
    expect(json.command).toBe('test:cmd');
    expect(json.timestamp).toBeDefined();
  });

  it('should check if caused by specific error type', () => {
    const typeError = new TypeError('type error');
    const error = new BaseError(typeError, 'test');
    expect(error.isCausedBy(TypeError)).toBe(true);
    expect(error.isCausedBy(RangeError)).toBe(false);
  });

  it('should check command with string', () => {
    const error = new BaseError(new Error('test'), 'user:create');
    expect(error.isCommand('user:create')).toBe(true);
    expect(error.isCommand('user:delete')).toBe(false);
  });

  it('should check command with regex', () => {
    const error = new BaseError(new Error('test'), 'user:create');
    expect(error.isCommand(/^user:/)).toBe(true);
    expect(error.isCommand(/^admin:/)).toBe(false);
  });

  it('should attach metadata with withMetadata', () => {
    const error = new BaseError(new Error('test'), 'test');
    error.withMetadata('key', 'value');
    expect(error.metadata?.key).toBe('value');
  });

  it('should create new error with withCommand', () => {
    const error = new BaseError(new Error('test'), 'old:cmd');
    const newError = error.withCommand('new:cmd');
    expect(newError.command).toBe('new:cmd');
    expect(error.command).toBe('old:cmd');
  });
});

describe('HttpError', () => {
  it('should create error with status code', () => {
    const error = new HttpError(400, 'Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request');
  });

  it('should include metadata', () => {
    const error = new HttpError(400, 'Bad request', { metadata: { field: 'email' } });
    expect(error.metadata?.field).toBe('email');
  });

  it('should convert to string', () => {
    const error = new HttpError(404, 'Not found');
    expect(error.toString()).toBe('HttpError [404]: Not found');
  });
});

describe('Pre-defined HTTP errors', () => {
  it('should create BadRequestError (400)', () => {
    const error = BadRequestError('Invalid input');
    expect(error.statusCode).toBe(400);
  });

  it('should create UnauthorizedError (401)', () => {
    const error = UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it('should create ForbiddenError (403)', () => {
    const error = ForbiddenError();
    expect(error.statusCode).toBe(403);
  });

  it('should create NotFoundError (404)', () => {
    const error = NotFoundError();
    expect(error.statusCode).toBe(404);
  });

  it('should create ConflictError (409)', () => {
    const error = ConflictError('Already exists');
    expect(error.statusCode).toBe(409);
  });

  it('should create TooManyRequestsError (429)', () => {
    const error = TooManyRequestsError();
    expect(error.statusCode).toBe(429);
  });

  it('should create InternalServerError (500)', () => {
    const error = InternalServerError();
    expect(error.statusCode).toBe(500);
  });
});

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('email', 'Invalid email');
    expect(error.field).toBe('email');
    expect(error.message).toBe('Invalid email');
  });

  it('should include value', () => {
    const error = new ValidationError('email', 'Invalid', { value: 'bad@' });
    expect(error.value).toBe('bad@');
  });

  it('should convert to string', () => {
    const error = new ValidationError('email', 'Invalid email');
    expect(error.toString()).toBe('ValidationError: email - Invalid email');
  });
});

describe('DatabaseError', () => {
  it('should create database error', () => {
    const error = new DatabaseError('insert', { table: 'users' });
    expect(error.operation).toBe('insert');
    expect(error.table).toBe('users');
  });

  it('should convert to string without table', () => {
    const error = new DatabaseError('query');
    expect(error.toString()).toBe('DatabaseError: query');
  });

  it('should convert to string with table', () => {
    const error = new DatabaseError('insert', { table: 'users' });
    expect(error.toString()).toBe('DatabaseError: insert on users');
  });
});

describe('SecurityError', () => {
  it('should create security error', () => {
    const error = new SecurityError('authentication', 'Invalid credentials');
    expect(error.type).toBe('authentication');
    expect(error.message).toBe('Invalid credentials');
  });

  it('should convert to string', () => {
    const error = new SecurityError('rate_limit', 'Too many requests');
    expect(error.toString()).toBe('SecurityError [rate_limit]: Too many requests');
  });
});

describe('Type guards', () => {
  it('isBaseError should identify BaseError', () => {
    const baseError = new BaseError(new Error('test'), 'test');
    expect(isBaseError(baseError)).toBe(true);
    expect(isBaseError(new Error('test'))).toBe(false);
  });

  it('isHttpError should identify HttpError', () => {
    const httpError = new HttpError(400, 'Bad request');
    expect(isHttpError(httpError)).toBe(true);
    expect(isHttpError(new Error('test'))).toBe(false);
  });
});

describe('ensureBaseError', () => {
  it('should return BaseError if already BaseError', () => {
    const original = new BaseError(new Error('test'), 'cmd');
    const result = ensureBaseError(original, 'other:cmd');
    expect(result).toBe(original);
  });

  it('should wrap Error in BaseError', () => {
    const error = new Error('test');
    const result = ensureBaseError(error, 'cmd');
    expect(isBaseError(result)).toBe(true);
    expect(result.cause).toBe(error);
  });

  it('should wrap string in BaseError', () => {
    const result = ensureBaseError('string error', 'cmd');
    expect(isBaseError(result)).toBe(true);
    expect(result.cause.message).toBe('string error');
  });
});

describe('toHttpResponse', () => {
  it('should convert HttpError to response', () => {
    const error = new HttpError(404, 'Not found');
    const response = toHttpResponse(error);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Not found');
  });

  it('should convert BaseError to 500 response', () => {
    const error = new BaseError(new Error('test'), 'cmd');
    const response = toHttpResponse(error);
    expect(response.status).toBe(500);
  });

  it('should convert Error to 500 response', () => {
    const error = new Error('test');
    const response = toHttpResponse(error);
    expect(response.status).toBe(500);
    expect(response.body.message).toBe('test');
  });

  it('should convert unknown to 500 response', () => {
    const response = toHttpResponse('string error');
    expect(response.status).toBe(500);
    expect(response.body.message).toBe('string error');
  });
});

describe('aggregateErrors', () => {
  it('should aggregate multiple errors', () => {
    const errors = [new Error('error 1'), new Error('error 2')];
    const result = aggregateErrors(errors, { command: 'batch:process' });

    expect(result.command).toBe('batch:process');
    expect(result.metadata?.errorCount).toBe(2);
    expect((result.metadata?.errors as any[]).length).toBe(2);
  });

  it('should use custom message', () => {
    const errors = [new Error('test')];
    const result = aggregateErrors(errors, { command: 'cmd', message: 'Custom message' });
    expect(result.cause.message).toBe('Custom message');
  });
});
