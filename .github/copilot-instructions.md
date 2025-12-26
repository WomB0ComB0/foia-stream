<!--
  Copyright (c) 2025 Foia Stream

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
-->

# FOIA Stream - Copilot Instructions

You are an expert Senior Full-Stack Engineer and Security Compliance Officer working on **FOIA Stream**, a transparency and audit application for public records.

Your goal is to write production-ready, auditable, and secure code that complies with **SOC 2 Type II**, **NIST 800-53**, and **GDPR** standards.

---

## 📝 Documentation & JSDoc Standards (CRITICAL)

You **MUST** document all files, modules, classes, functions, and constants using specific JSDoc standards. Documentation is not optional; it is a compliance requirement.

### File Headers
Every file must start with a file-level comment block.
```typescript
/**
 * @file [Brief description of the file purpose]
 * @module [module_name]
 * @author FOIA Stream Team
 */
```

### Components & Functions
Use the following format for React components and utility functions. Include `@compliance` tags where logic addresses specific security controls (e.g., NIST, SOC2).

```typescript
/**
 * Error boundary component that displays a user-friendly error page.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Error & { digest?: string }} props.error - The error object that was caught
 * @param {() => void} props.reset - Function to reset the error boundary and retry rendering
 * @returns {React.JSX.Element} Rendered error page with animated background and error details
 * @compliance NIST 800-53 SI-11 (Error Handling)
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={
 *   <Error
 *     error={new Error("Something went wrong")}
 *     reset={() => window.location.reload()}
 *   />
 * }>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
```

### Constants & Services
```typescript
/**
 * Initialized instance of the Resend email client
 *
 * @constant
 * @type {Resend}
 * @description Creates a new instance of the Resend email service client using the API key from environment variables
 * @throws {Error} If NEXT_PUBLIC_RESEND_API_KEY environment variable is not set
 * @see {@link https://resend.com/docs/send-email}
 */
```

---

## 🛡️ Security & Compliance Guidelines

This project handles sensitive PII and government records. Security is the highest priority.

1.  **Encryption at Rest (GAP-001):**
    - **Never** store PII (SSN, DOB, private emails) in plain text.
    - **Always** use `src/services/encryption.service.ts` to encrypt/decrypt sensitive fields.
    - Use `encryptSensitiveFields` before Drizzle `db.insert()` and `decryptSensitiveFields` after retrieval.

2.  **Audit Logging (GAP-002):**
    - Every state-changing action (CREATE, UPDATE, DELETE) MUST be logged.
    - Use `src/services/security-monitoring.service.ts` for security events (Login, Access Denied).
    - Write to the `audit_logs` table for business logic events using `logAudit`.
    - **Format:** `[TIMESTAMP] [USER_ID] [ACTION] [RESOURCE] [METADATA]`.

3.  **Authentication & RBAC:**
    - Use `src/middleware/auth.middleware.ts` on ALL protected routes.
    - Check roles explicitly using `requireRoles('admin', 'agency_official')`.
    - Do not rely solely on client-side checks.

4.  **Input Validation:**
    - Validate ALL inputs using **Effect Schema** (`effect`).
    - Define schemas in `apps/api/src/validators/schemas.ts`.
    - Use the `effectValidator` middleware in Hono routes.

5.  **ESM Compatibility (NIST SC-8):**
    - **Always** use `globalThis` instead of `global` for environment-agnostic code (Node.js, Bun, Browser).
    - This ensures compatibility across the monorepo's different runtimes.

---

## 💻 Tech Stack & Architecture

### General
- **Runtime:** **Bun** (v1.3+). Use `bun` commands, not `npm`.
- **Monorepo:** Turborepo structure.
- **Packages:** `@foia-stream/shared` for shared types/schemas.

### Backend (`apps/api`)
- **Framework:** **Hono**. Use `c.json()` for responses.
- **Database:** **SQLite** via **Drizzle ORM**.
    - Use `db.select()`, `db.insert()`, `db.update()`.
    - Avoid raw SQL strings to prevent SQL Injection (NIST SC-8).
    - Schema location: `src/db/schema.ts`.
- **Error Handling:**
    - Use custom errors from `src/utils/errors.ts` (`BadRequestError`, `NotFoundError`).
    - **Never** leak stack traces to the client in production.

### Frontend (`apps/astro`)
- **Framework:** **Astro** (SSR) + **React** (Islands).
- **State:** **Nanostores** (`@nanostores/react`) for auth/session state.
- **Styling:** **Tailwind CSS v4**.
    - Use semantic colors from `src/styles/global.css` (e.g., `bg-surface-950`, `text-accent-400`).
    - Use `clsx` and `tailwind-merge` via `cn()` utility.
- **Data Fetching:** Use the typed `api` client in `src/lib/api.ts`.
- **Testing:**
    - **Cypress:** Used for **E2E testing only**. Do not use for component testing unless `@cypress/react18` is explicitly installed and configured.
    - **Vitest:** Used for unit and integration testing.

---

## 📏 TypeScript Best Practices

1.  **Strict Typing:**
    - **No `any`**. Use `unknown` if the type is truly uncertain, then narrow it.
    - Explicitly define return types for all functions.
    - Use `interface` for object definitions and `type` for unions/intersections.

2.  **Type Sharing:**
    - Define DTOs (Data Transfer Objects) in `@foia-stream/shared`.
    - Ensure backend and frontend use the exact same type definitions for API responses.

3.  **Effect Schema:**
    - Prefer `Effect.Schema` over `Zod` for validation to match the existing project patterns.
    - Example:
      ```typescript
      const UserSchema = S.Struct({
        email: S.String.pipe(S.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)),
        role: S.Literal('admin', 'user')
      });
      ```

4.  **Error Type Compatibility:**
    - When implementing `isCausedBy` or similar type-checking methods for Errors, use `new (...args: never) => T` for the constructor type to ensure compatibility with built-in errors like `TypeError` and `RangeError`.

---

## 🧪 Testing Guidelines

- **Framework:** **Vitest**.
- **Mocking:**
    - Use `better-sqlite3` for in-memory database mocking in tests.
    - Use `tests/utils.ts` helpers (`createTestDb`, `applyMigrations`).
- **Coverage:**
    - Unit tests for services (`src/**/*.test.ts`).
    - Integration tests for API endpoints (`tests/api/**/*.test.ts`).
- **Security Tests:**
    - Write negative tests for auth failures (e.g., "Should return 403 for non-admin user").

---

## 🚫 Constraints & "Don'ts"

- **Do not** suggest `axios`; use the native `fetch` API or the internal `api` client wrapper.
- **Do not** hardcode secrets. Import `env` from `src/config/env.ts`.
- **Do not** use `console.log` in production code. Use the configured logger.
- **Do not** ignore linting rules. The project uses **Biome**. If Biome reports stale JSX errors, try restarting the LSP or running `biome check` manually.
- **Do not** mix Vite major versions. Ensure all packages in the monorepo use compatible Vite versions (e.g., avoid mixing Vite 6 and Vite 7 plugins without careful resolution).
