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
 * @file Application Constants
 * @module lib/constants
 * @author FOIA Stream Team
 * @description Shared constants, error messages, and reusable schemas
 *              for the FOIA Stream API.
 */

/**
 * Common Zod validation error messages
 * @constant
 */
export const ZOD_ERROR_MESSAGES = {
  REQUIRED: 'Required',
  EXPECTED_NUMBER: 'Invalid input: expected number, received NaN',
  NO_UPDATES: 'No updates provided',
  EXPECTED_STRING: 'Invalid input: expected string, received undefined',
  INVALID_EMAIL: 'Invalid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  INVALID_UUID: 'Invalid UUID format',
} as const;

/**
 * Custom Zod error codes
 * @constant
 */
export const ZOD_ERROR_CODES = {
  INVALID_UPDATES: 'invalid_updates',
  INVALID_CREDENTIALS: 'invalid_credentials',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
} as const;

/**
 * HTTP Status phrases for responses
 * @constant
 */
export * as HttpStatusCodes from 'stoker/http-status-codes';
export * as HttpStatusPhrases from 'stoker/http-status-phrases';
