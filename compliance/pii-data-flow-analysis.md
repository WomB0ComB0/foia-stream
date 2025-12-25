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

# PII Data Flow Analysis & Compliance Posture

**Last Updated:** December 25, 2025
**Version:** 1.2.0

## Executive Summary

This document analyzes FOIA Stream's data flow to identify PII exposure points and ensure compliance with applicable privacy regulations including NY SHIELD Act, FTC Section 5, and (if applicable) GDPR/CCPA.

**Compliance Status:** ✅ Core requirements met (PII logging redaction, breach notification, password security)

---

## 1. Data Flow Architecture

### 1.1 Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Browser      │────▶│   FOIA Stream    │────▶│  SQLite DB      │
│  (User Agent)   │     │   API (Hono)     │     │  (Encrypted)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Pino Logger    │
                        │   (Structured)   │
                        └──────────────────┘
```

### 1.2 PII Categories Identified

| Category | Fields | Storage | Encryption |
|----------|--------|---------|------------|
| **Account PII** | email, firstName, lastName | users table | ❌ Plain text |
| **Request PII** | description, title | foia_requests table | ❌ Plain text |
| **Session Data** | ipAddress, userAgent | sessions table | ✅ AES-256-GCM |
| **Sensitive PII** | SSN, DOB, taxId, etc. | (if collected) | ✅ AES-256-GCM |
| **Passwords** | passwordHash | users table | ✅ Argon2id + pepper |

---

## 2. PII Leakage Points

### 2.1 ✅ Pino Logger (MITIGATED)

**Current State:** PII redaction implemented with 25+ field patterns.

**Implementation (`middlewares/pino-logger.ts`):**
```typescript
const PII_REDACT_PATHS = [
  'req.body.password', 'req.body.email', 'req.body.ssn',
  'req.headers.authorization', 'req.headers.cookie',
  '*.password', '*.token', '*.secret', '*.apiKey',
  // ... 25+ patterns total
];

export function pinoLogger() {
  return logger({
    pino: pino({
      redact: { paths: PII_REDACT_PATHS, censor: '[REDACTED]' },
    }),
  });
}
```

**Status:** ✅ All sensitive fields redacted as `[REDACTED]` in logs.

### 2.2 ✅ Session Storage (MITIGATED)

**Current State:** IP addresses and user agents are encrypted via `secure-session.service.ts`.

**Implementation:**
- `SecureSessionService.encryptMetadata()` encrypts IP, userAgent, and deviceName
- Uses AES-256-GCM via `encryptData()` from `utils/security.ts`
- Session TTL enforcement via `data-retention.service.ts` (30 days)

**Status:** ✅ Session PII encrypted at rest.

### 2.3 ⚠️ User Email Storage

**Current State:** Email stored in plain text in `users` table.

**Risk:** Email is PII; if database compromised, emails exposed.

**Recommendation:** Consider encrypting email at rest using existing `encryptionService`.

### 2.4 ✅ Encryption Service (Compliant)

**Current State:** `encryption.service.ts` implements AES-256-GCM for sensitive fields.

**Covered Fields:**
- `ssn`, `socialSecurityNumber`, `taxId`
- `bankAccount`, `creditCard`, `dateOfBirth`
- `medicalRecord`, `personalAddress`, `phoneNumber`
- `email`, `attachmentContent`, `requestContent`

### 2.5 ✅ Password Security (Compliant)

**Current State:** `password.service.ts` implements Argon2id with server-side pepper.

**Implementation Details:**
- **Algorithm:** Argon2id (winner of Password Hashing Competition)
- **Memory Cost:** 64 MiB (prevents GPU/ASIC attacks)
- **Time Cost:** 3 iterations
- **Parallelism:** 4 threads
- **Server-side Pepper:** Appended before hashing (stored in `PASSWORD_PEPPER` env)
- **Salt:** Automatically generated per-password by Argon2

**Compliance:** NIST 800-53 IA-5, OWASP Password Storage Cheat Sheet

### 2.6 ✅ Data Retention (Compliant)

**Current State:** `data-retention.service.ts` implements automated purging.

**Retention Periods:**
- Active FOIA requests: Indefinite
- Closed FOIA requests: 7 years
- Inactive user accounts: 2 years
- Audit logs: 7 years
- Session data: 30 days

---

## 3. Regulatory Compliance Status

### 3.1 NY SHIELD Act (Applicable)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Reasonable administrative safeguards | ✅ | RBAC, audit logging |
| Reasonable technical safeguards | ✅ | Encryption + PII-redacted logging |
| Reasonable physical safeguards | N/A | Cloud-hosted |
| Risk assessment | ✅ | This document |
| Employee training | ❌ | Not applicable (no employees yet) |
| Breach notification procedure | ✅ | `runbooks/breach-notification.md` |

### 3.2 FTC Section 5 (Applicable)

| Requirement | Status | Notes |
|-------------|--------|-------|
| No deceptive privacy claims | ✅ | Privacy policy must match actual practices |
| Reasonable security measures | ✅ | PII redaction in logs implemented |
| Data minimization | ⚠️ | Consider reducing stored PII |

### 3.3 GDPR (Potentially Applicable - EU Users)

| Article | Requirement | Status |
|---------|-------------|--------|
| Art. 5 | Data minimization | ⚠️ |
| Art. 6 | Lawful basis | ⚠️ Need to document |
| Art. 12-23 | Data subject rights | ✅ `dataRetentionService.handleDataSubjectRequest()` |
| Art. 25 | Privacy by design | ✅ PII redaction implemented |
| Art. 32 | Security measures | ✅ AES-256-GCM encryption |
| Art. 33-34 | Breach notification | ✅ `runbooks/breach-notification.md` |

### 3.4 CCPA/CPRA (Likely Not Applicable Yet)

Thresholds not met:
- ❌ $25M+ annual revenue
- ❌ 100,000+ CA consumers' PI
- ❌ 50%+ revenue from selling PI

---

## 4. Recommended Architecture Improvements

### 4.1 "PII-Zero-Retention" Pattern for Request Relay

If/when implementing direct agency submission:

```typescript
// DO NOT store request body in logs
pinoLogger({
  redact: {
    paths: [
      'req.body',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.email',
      '*.ssn',
    ],
    censor: '[REDACTED]'
  }
});
```

### 4.2 IP Address Anonymization

```typescript
// Hash IP addresses before storage
function anonymizeIp(ip: string): string {
  const hash = createHash('sha256');
  hash.update(ip + env.IP_SALT);
  return hash.digest('hex').substring(0, 16);
}
```

### 4.3 Email Encryption at Rest

```typescript
// In user creation flow
const encryptedEmail = encryptionService.encrypt(email);
await db.insert(users).values({
  // ...
  email: encryptedEmail, // Store encrypted
  emailHash: hashEmail(email), // For lookup
});
```

---

## 5. Action Items

### Immediate (P0)

- [x] Add PII redaction to Pino logger configuration ✅ (Implemented Dec 25, 2025)
- [x] Document breach notification procedure ✅ (See `runbooks/breach-notification.md`)
- [ ] Review error tracking for PII exposure (if Sentry/similar added)

### Short-term (P1)

- [x] Anonymize/hash IP addresses in sessions ✅ (Encrypted via `secure-session.service.ts`)
- [ ] Encrypt user emails at rest
- [ ] Add WCAG 2.2 AA accessibility audit

### Medium-term (P2)

- [ ] Implement "no-proxy" submission option (user → agency direct)
- [ ] Add privacy policy auto-generation based on actual data practices
- [ ] Consider GDPR cookie consent if adding analytics

---

## 6. WCAG 2.2 AA Accessibility Checklist

Per DOJ ADA guidance and W3C WCAG 2.2:

### Perceivable
- [ ] All images have alt text
- [ ] Color is not the only means of conveying information
- [ ] Text contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
- [ ] Content is responsive and doesn't require horizontal scrolling

### Operable
- [ ] All functionality available via keyboard
- [ ] Skip navigation links provided
- [ ] Focus indicators visible
- [ ] No content flashes more than 3 times per second

### Understandable
- [ ] Language of page is identified in HTML
- [ ] Form labels are associated with inputs
- [ ] Error messages are descriptive and suggest fixes
- [ ] Consistent navigation across pages

### Robust
- [ ] Valid HTML markup
- [ ] ARIA attributes used correctly
- [ ] Name, role, value exposed to assistive tech

---

## 7. References

- [NY SHIELD Act](https://ag.ny.gov/resources/organizations/data-breach-reporting/shield-act)
- [FTC Privacy Enforcement](https://www.ftc.gov/news-events/topics/protecting-consumer-privacy-security/privacy-security-enforcement)
- [GDPR Art. 3 Territorial Scope](https://gdpr-info.eu/art-3-gdpr/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [DOJ ADA Web Guidance](https://www.ada.gov/resources/web-guidance/)
- [FOIA Exemptions 6 & 7(C)](https://www.justice.gov/oip/training/exemption_6_and_7c_july_2019/dl)
