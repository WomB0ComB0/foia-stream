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

# FOIA Stream Compliance Documentation

> Last Updated: December 25, 2024

This document outlines the compliance measures implemented in FOIA Stream to meet CCPA, GDPR, SOC 2 Type 1/2, and security best practices.

## Table of Contents

- [Overview](#overview)
- [Data Privacy Compliance](#data-privacy-compliance)
- [Security Controls](#security-controls)
- [Data Retention](#data-retention)
- [Consent Management](#consent-management)
- [Audit Logging](#audit-logging)
- [Implementation Details](#implementation-details)

---

## Overview

FOIA Stream is designed with privacy and security as core principles. We implement:

| Framework | Status | Description |
|-----------|--------|-------------|
| **CCPA** | ✅ Implemented | California Consumer Privacy Act compliance |
| **GDPR** | ✅ Implemented | General Data Protection Regulation compliance |
| **SOC 2 Type 1** | 🔄 In Progress | Point-in-time security control assessment |
| **SOC 2 Type 2** | 📋 Planned | Operational effectiveness over time |
| **NIST 800-53** | ✅ Implemented | Federal security controls |

---

## Data Privacy Compliance

### CCPA Requirements

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| Right to Know | User data export available | Settings → Account |
| Right to Delete | Full account deletion | Settings → Danger Zone |
| Right to Opt-Out | No data sales (N/A) | Privacy Policy |
| Non-Discrimination | No differentiated service | By design |

### GDPR Requirements

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| Art. 5 | Data Minimization | 90-day content retention |
| Art. 7 | Consent | Explicit checkbox at registration |
| Art. 13/14 | Transparency | Privacy Policy |
| Art. 15 | Right of Access | Data export |
| Art. 17 | Right to Erasure | Account deletion |
| Art. 25 | Privacy by Design | Encryption at rest |
| Art. 32 | Security | AES-256-GCM, Argon2id |

---

## Security Controls

### Authentication (NIST 800-53 IA-2)

```
┌─────────────────────────────────────────────────────────┐
│                    Authentication Flow                   │
├─────────────────────────────────────────────────────────┤
│  User → [Email/Password] → Argon2id Verification        │
│                              ↓                          │
│                    [MFA Check if enabled]               │
│                              ↓                          │
│                    [TOTP Verification]                  │
│                              ↓                          │
│                    [JWT Token Issued]                   │
│                              ↓                          │
│                    [Session Created]                    │
└─────────────────────────────────────────────────────────┘
```

**Password Security:**
- Algorithm: Argon2id (Password Hashing Competition winner)
- Minimum length: 8 characters
- Brute-force protection: Account lockout after failed attempts

**Multi-Factor Authentication:**
- TOTP-based (RFC 6238)
- Backup codes provided
- Optional but recommended

### Encryption

| Data Type | Method | Key Size |
|-----------|--------|----------|
| Passwords | Argon2id | N/A (hash) |
| TOTP Secrets | AES-256-GCM | 256-bit |
| IP Addresses | AES-256-GCM | 256-bit |
| Session Data | AES-256-GCM | 256-bit |

**Environment Variable:**
```
DATA_ENCRYPTION_KEY=<64-character-hex-string>
```

### Transport Security (NIST 800-53 SC-8)

- HTTPS enforcement in production
- HSTS header with 1-year max-age
- TLS 1.3 recommended

**Middleware:** `apps/api/src/middleware/security.middleware.ts`

```typescript
// HTTPS enforcement
app.use('*', httpsEnforcement());

// Security headers
app.use('*', securityHeaders());
```

### Access Control (NIST 800-53 AC-3)

Role-based access control with the following roles:
- `civilian` (default)
- `journalist`
- `researcher`
- `attorney`
- `community_advocate`
- `agency_official`
- `admin`

---

## Data Retention

### Retention Periods

| Data Type | Retention Period | Trigger |
|-----------|------------------|---------|
| FOIA Request Content | **90 days** | After completion |
| Request Metadata | Until deletion | Account action |
| Session Data | **30 days** | After last activity |
| Audit Logs | **1 year** | From creation |

### Automatic Purge

**Service:** `apps/api/src/services/data-retention.service.ts`

```typescript
// Configuration
export const RETENTION_CONFIG = {
  REQUEST_CONTENT_DAYS: 90,
  SESSION_INACTIVE_DAYS: 30,
  AUDIT_LOG_DAYS: 365,
};

// Run cleanup (call via cron job)
await dataRetentionService.runRetentionCleanup();
```

**What Gets Purged:**
- `title` → `[Content purged per data retention policy]`
- `description` → `[Content purged per data retention policy]`
- Original title hash preserved for reference

### Setting Up Automated Cleanup

Add a cron job to call the retention endpoint daily:

```bash
# Run at 2 AM daily
0 2 * * * curl -X POST https://api.foiastream.com/api/v1/admin/retention/cleanup
```

Or integrate with your scheduler:

```typescript
import { dataRetentionService } from '@/services/data-retention.service';

// In your cron handler
const results = await dataRetentionService.runRetentionCleanup();
console.log(`Purged ${results.requestContentPurged} requests, ${results.sessionsPurged} sessions`);
```

---

## Consent Management

### Registration Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Consent Collection                    │
├─────────────────────────────────────────────────────────┤
│  ☑ I agree to the Terms of Service *                    │
│  ☑ I have read and agree to the Privacy Policy *        │
│  ☑ I consent to the processing of my FOIA requests... * │
│                                                          │
│  * Required fields                                       │
└─────────────────────────────────────────────────────────┘
```

### Consent Tracking

**Service:** `apps/api/src/services/consent.service.ts`

**Database Tables:**
- `users.terms_accepted_at`
- `users.privacy_accepted_at`
- `users.data_processing_consent_at`
- `users.marketing_consent_at`
- `consent_history` (immutable audit trail)

**Policy Versioning:**
```typescript
export const POLICY_VERSIONS = {
  terms: '2024.12.25',
  privacy: '2024.12.25',
  data_processing: '2024.12.25',
  marketing: '2024.12.25',
};
```

### Consent Withdrawal

Users can withdraw consent via Settings or API:

```typescript
await consentService.withdrawConsent(userId, 'marketing');
```

---

## Audit Logging

### Logged Events (NIST 800-53 AU-2)

| Category | Events |
|----------|--------|
| **User** | Created, Login, Logout, Updated, Deleted |
| **Security** | Failed Login, Lockout, MFA Enable/Disable, Password Change |
| **Consent** | Given, Withdrawn, Updated |
| **Retention** | Content Purge, Archive, Delete |
| **Request** | Created, Submitted, Updated |

### Log Structure

```typescript
{
  id: 'uuid',
  userId: 'uuid',
  action: 'security_mfa_enabled',
  resourceType: 'user',
  resourceId: 'uuid',
  details: { ... },
  ipAddress: 'encrypted',
  userAgent: 'Mozilla/5.0...',
  createdAt: '2024-12-25T00:00:00.000Z'
}
```

---

## Implementation Details

### File Locations

```
apps/api/src/
├── middleware/
│   └── security.middleware.ts    # HTTPS, headers, request ID
├── services/
│   ├── consent.service.ts        # GDPR consent management
│   ├── data-retention.service.ts # Automatic data purge
│   └── secure-session.service.ts # Encrypted session data
├── db/
│   └── schema.ts                 # consent_history table
└── routes/auth/
    └── auth.handlers.ts          # Consent recording

apps/astro/src/
├── pages/
│   ├── privacy.astro             # Privacy Policy page
│   └── terms.astro               # Terms of Service page
└── components/react/
    └── RegisterForm.tsx          # Consent checkboxes
```

### Schema Additions

```sql
-- Users table additions
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
ALTER TABLE users ADD COLUMN privacy_accepted_at TEXT;
ALTER TABLE users ADD COLUMN data_processing_consent_at TEXT;
ALTER TABLE users ADD COLUMN marketing_consent_at TEXT;
ALTER TABLE users ADD COLUMN consent_updated_at TEXT;

-- FOIA requests additions
ALTER TABLE foia_requests ADD COLUMN content_purge_at TEXT;
ALTER TABLE foia_requests ADD COLUMN content_purged INTEGER DEFAULT 0;
ALTER TABLE foia_requests ADD COLUMN title_hash TEXT;

-- New consent_history table
CREATE TABLE consent_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  policy_version TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Running Database Migrations

```bash
cd apps/api
bun run drizzle-kit push
```

---

## Compliance Checklist

### Pre-Launch

- [x] Privacy Policy page created
- [x] Terms of Service page created
- [x] Consent checkboxes on registration
- [x] Consent history tracking
- [x] HTTPS enforcement middleware
- [x] Security headers (HSTS, CSP, etc.)
- [x] Data retention service created
- [x] Account deletion functionality
- [x] Data export capability
- [ ] Cookie consent banner (if using analytics)
- [ ] DPA (Data Processing Agreement) template

### Ongoing

- [ ] Schedule daily retention cleanup cron
- [ ] Monitor audit logs for security events
- [ ] Review and update policies annually
- [ ] Conduct security assessments
- [ ] Train team on data handling procedures

---

## Contact

For compliance questions:
- **Privacy:** privacy@foiastream.com
- **Legal:** legal@foiastream.com
- **Security:** security@foiastream.com
- **DPO (GDPR):** dpo@foiastream.com
