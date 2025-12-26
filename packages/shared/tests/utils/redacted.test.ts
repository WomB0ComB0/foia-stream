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
 * @file Redacted utility tests
 * @module tests/utils/redacted
 * @author FOIA Stream Team
 */

import { describe, expect, it } from 'vitest';
import { COMMON_SENSITIVE_FIELDS, REDACTED_MARKER, Redacted } from '../../src/utils/redacted';

describe('Redacted', () => {
  describe('make', () => {
    it('should create a Redacted instance with string value', () => {
      const secret = Redacted.make('password123');
      expect(secret).toBeInstanceOf(Redacted);
    });

    it('should create a Redacted instance with number value', () => {
      const secret = Redacted.make(123456);
      expect(secret).toBeInstanceOf(Redacted);
    });

    it('should create a Redacted instance with object value', () => {
      const secret = Redacted.make({ key: 'value' });
      expect(secret).toBeInstanceOf(Redacted);
    });

    it('should throw error for null value', () => {
      expect(() => Redacted.make(null)).toThrow('Redacted value cannot be null or undefined');
    });

    it('should throw error for undefined value', () => {
      expect(() => Redacted.make(undefined)).toThrow('Redacted value cannot be null or undefined');
    });
  });

  describe('getValue', () => {
    it('should return the original string value', () => {
      const original = 'my-secret-password';
      const secret = Redacted.make(original);
      expect(secret.getValue()).toBe(original);
    });

    it('should return the original number value', () => {
      const original = 123456789;
      const secret = Redacted.make(original);
      expect(secret.getValue()).toBe(original);
    });

    it('should return the original object value', () => {
      const original = { apiKey: 'sk-12345', secret: 'shhh' };
      const secret = Redacted.make(original);
      expect(secret.getValue()).toEqual(original);
    });
  });

  describe('toString', () => {
    it('should return [REDACTED] marker', () => {
      const secret = Redacted.make('password');
      expect(secret.toString()).toBe(REDACTED_MARKER);
    });

    it('should return [REDACTED] for any value type', () => {
      expect(Redacted.make(12345).toString()).toBe('[REDACTED]');
      expect(Redacted.make({ key: 'value' }).toString()).toBe('[REDACTED]');
      expect(Redacted.make(['a', 'b']).toString()).toBe('[REDACTED]');
    });
  });

  describe('toJSON', () => {
    it('should return [REDACTED] for JSON serialization', () => {
      const secret = Redacted.make('sensitive-data');
      expect(secret.toJSON()).toBe(REDACTED_MARKER);
    });

    it('should serialize as [REDACTED] in JSON.stringify', () => {
      const obj = {
        username: 'john',
        password: Redacted.make('secret123'),
      };
      const json = JSON.stringify(obj);
      expect(json).toBe('{"username":"john","password":"[REDACTED]"}');
    });

    it('should serialize nested redacted values correctly', () => {
      const obj = {
        user: {
          email: 'john@example.com',
          ssn: Redacted.make('123-45-6789'),
        },
        apiKey: Redacted.make('sk-secret'),
      };
      const json = JSON.stringify(obj);
      expect(json).toContain('"ssn":"[REDACTED]"');
      expect(json).toContain('"apiKey":"[REDACTED]"');
      expect(json).not.toContain('123-45-6789');
      expect(json).not.toContain('sk-secret');
    });
  });

  describe('inspect', () => {
    it('should return [REDACTED] marker', () => {
      const secret = Redacted.make('password');
      expect(secret.inspect()).toBe(REDACTED_MARKER);
    });
  });

  describe('valueOf', () => {
    it('should return the underlying value', () => {
      const original = 'secret-value';
      const secret = Redacted.make(original);
      expect(secret.valueOf()).toBe(original);
    });
  });

  describe('equals', () => {
    it('should return true for equal values', () => {
      const a = Redacted.make('secret');
      const b = Redacted.make('secret');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = Redacted.make('secret1');
      const b = Redacted.make('secret2');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for non-Redacted values', () => {
      const a = Redacted.make('secret');
      // @ts-expect-error Testing non-Redacted value
      expect(a.equals('secret')).toBe(false);
      // @ts-expect-error Testing non-Redacted value
      expect(a.equals({ getValue: () => 'secret' })).toBe(false);
    });
  });

  describe('isRedacted', () => {
    it('should return true for Redacted instances', () => {
      const secret = Redacted.make('password');
      expect(Redacted.isRedacted(secret)).toBe(true);
    });

    it('should return false for non-Redacted values', () => {
      expect(Redacted.isRedacted('password')).toBe(false);
      expect(Redacted.isRedacted(123)).toBe(false);
      expect(Redacted.isRedacted(null)).toBe(false);
      expect(Redacted.isRedacted(undefined)).toBe(false);
      expect(Redacted.isRedacted({ value: 'secret' })).toBe(false);
    });

    it('should work as type guard', () => {
      const maybeSecret: unknown = Redacted.make('test');
      if (Redacted.isRedacted<string>(maybeSecret)) {
        // TypeScript should know this is Redacted<string>
        expect(maybeSecret.getValue()).toBe('test');
      }
    });
  });

  describe('redactFields', () => {
    it('should redact specified fields', () => {
      const user = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        phone: '555-1234',
      };

      const safe = Redacted.redactFields(user, ['ssn']);
      expect(safe.name).toBe('John Doe');
      expect(safe.email).toBe('john@example.com');
      expect(safe.phone).toBe('555-1234');
      expect(Redacted.isRedacted(safe.ssn)).toBe(true);
      expect((safe.ssn as Redacted<string>).getValue()).toBe('123-45-6789');
    });

    it('should redact multiple fields', () => {
      const data = {
        username: 'admin',
        password: 'secret123',
        apiKey: 'sk-12345',
        publicData: 'visible',
      };

      const safe = Redacted.redactFields(data, ['password', 'apiKey']);
      expect(safe.username).toBe('admin');
      expect(safe.publicData).toBe('visible');
      expect(Redacted.isRedacted(safe.password)).toBe(true);
      expect(Redacted.isRedacted(safe.apiKey)).toBe(true);
    });

    it('should skip null/undefined fields', () => {
      const data = {
        name: 'Test',
        password: null as string | null,
        apiKey: undefined as string | undefined,
      };

      const safe = Redacted.redactFields(data, ['password', 'apiKey']);
      expect(safe.name).toBe('Test');
      expect(safe.password).toBeNull();
      expect(safe.apiKey).toBeUndefined();
    });

    it('should preserve non-sensitive fields', () => {
      const data = {
        id: 1,
        name: 'Test',
        active: true,
        ssn: '123-45-6789',
      };

      const safe = Redacted.redactFields(data, ['ssn']);
      expect(safe.id).toBe(1);
      expect(safe.name).toBe('Test');
      expect(safe.active).toBe(true);
    });
  });

  describe('Node.js inspect symbol', () => {
    it('should return [REDACTED] for util.inspect', () => {
      const secret = Redacted.make('password');
      const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');
      // @ts-expect-error Testing Symbol access
      expect(secret[inspectSymbol]()).toBe(REDACTED_MARKER);
    });
  });
});

describe('REDACTED_MARKER', () => {
  it('should be [REDACTED]', () => {
    expect(REDACTED_MARKER).toBe('[REDACTED]');
  });
});

describe('COMMON_SENSITIVE_FIELDS', () => {
  it('should contain common PII field names', () => {
    expect(COMMON_SENSITIVE_FIELDS).toContain('password');
    expect(COMMON_SENSITIVE_FIELDS).toContain('ssn');
    expect(COMMON_SENSITIVE_FIELDS).toContain('creditCard');
    expect(COMMON_SENSITIVE_FIELDS).toContain('apiKey');
    expect(COMMON_SENSITIVE_FIELDS).toContain('token');
    expect(COMMON_SENSITIVE_FIELDS).toContain('accessToken');
    expect(COMMON_SENSITIVE_FIELDS).toContain('privateKey');
  });

  it('should be readonly array', () => {
    expect(Array.isArray(COMMON_SENSITIVE_FIELDS)).toBe(true);
    expect(COMMON_SENSITIVE_FIELDS.length).toBeGreaterThan(0);
  });
});

describe('FOIA compliance scenarios', () => {
  it('should protect PII in FOIA request data', () => {
    const foiaRequest = {
      requestId: 'FOIA-2025-001',
      requesterName: 'John Smith',
      requesterSSN: '123-45-6789',
      requesterEmail: 'john@example.com',
      subject: 'Records request',
    };

    const safe = Redacted.redactFields(foiaRequest, ['requesterSSN']);
    const serialized = JSON.stringify(safe);

    expect(serialized).not.toContain('123-45-6789');
    expect(serialized).toContain('[REDACTED]');
    expect(serialized).toContain('FOIA-2025-001');
    expect(serialized).toContain('John Smith');
  });

  it('should protect sensitive agency credentials', () => {
    const agencyConfig = {
      agencyId: 'FBI',
      apiEndpoint: 'https://api.fbi.gov',
      apiKey: Redacted.make('super-secret-key'),
      secretToken: Redacted.make('bearer-token-123'),
    };

    const logged = JSON.stringify(agencyConfig);
    expect(logged).not.toContain('super-secret-key');
    expect(logged).not.toContain('bearer-token-123');
    expect(logged).toContain('FBI');
    expect(logged).toContain('https://api.fbi.gov');
  });

  it('should allow safe logging of user data', () => {
    const userData = {
      userId: 'user-123',
      email: 'user@example.com',
      password: Redacted.make('hashed-password'),
      dateOfBirth: Redacted.make('1990-01-15'),
      loginAttempts: 3,
    };

    // Simulate logging
    const logOutput = `User login attempt: ${JSON.stringify(userData)}`;

    expect(logOutput).not.toContain('hashed-password');
    expect(logOutput).not.toContain('1990-01-15');
    expect(logOutput).toContain('user-123');
    expect(logOutput).toContain('user@example.com');
  });
});
