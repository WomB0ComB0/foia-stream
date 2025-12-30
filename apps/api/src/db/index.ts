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
 * @file Database Connection
 * @module db
 * @author FOIA Stream Team
 * @description Initializes and exports the SQLite database connection using Drizzle ORM.
 *              Configures WAL mode for improved concurrent performance.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */

// ============================================
// FOIA Stream - Database Connection
// ============================================

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Database file path from environment or default - resolved relative to this module to support scripts run from repo root
 *
 * @constant
 * @type {string}
 */
const DB_PATH = process.env.DATABASE_URL || fileURLToPath(new URL('../../data/foia-stream.db', import.meta.url));

// Ensure database directory exists (create if missing)
const _dbDir = path.dirname(DB_PATH);
if (!existsSync(_dbDir)) {
  mkdirSync(_dbDir, { recursive: true });
}

/**
 * Native Bun SQLite database instance
 *
 * @constant
 * @type {Database}
 * @description Creates or opens the SQLite database file with write-ahead logging enabled.
 */
const sqlite = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent read/write performance
sqlite.exec('PRAGMA journal_mode = WAL');

/**
 * Drizzle ORM database instance
 *
 * @constant
 * @type {ReturnType<typeof drizzle>}
 * @description Drizzle ORM wrapper around the SQLite connection with typed schema.
 *
 * @example
 * ```typescript
 * import { db } from './db';
 * import { users } from './db/schema';
 *
 * // Query users
 * const allUsers = await db.select().from(users);
 *
 * // Insert user
 * await db.insert(users).values({ ... });
 * ```
 */
export const db = drizzle(sqlite, { schema });

/**
 * Re-exported schema for type-safe queries
 * @see {@link ./schema}
 */
export { schema };

/**
 * Raw SQLite connection for migrations and direct queries
 * @description Use with caution - prefer Drizzle ORM methods for type safety
 */
export { sqlite };
