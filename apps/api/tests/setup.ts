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

// ============================================
// FOIA Stream - Test Setup
// ============================================

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { afterAll, beforeAll } from 'vitest';

// Use a separate test database
process.env.DATABASE_URL = './data/test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

// Ensure test data directory exists
const testDataDir = './data';
if (!existsSync(testDataDir)) {
  mkdirSync(testDataDir, { recursive: true });
}

// Clean up test database before all tests
beforeAll(async () => {
  const testDbPath = './data/test.db';

  // Remove existing test database files
  if (existsSync(testDbPath)) {
    rmSync(testDbPath, { force: true });
  }
  if (existsSync(`${testDbPath}-shm`)) {
    rmSync(`${testDbPath}-shm`, { force: true });
  }
  if (existsSync(`${testDbPath}-wal`)) {
    rmSync(`${testDbPath}-wal`, { force: true });
  }
});

// Global teardown
afterAll(async () => {
  // Clean up happens per test file, not globally
});
