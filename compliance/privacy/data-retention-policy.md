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

# Data Retention Policy

**Document Version:** 1.0
**Effective Date:** 2025-01-XX
**Owner:** Compliance Officer
**Classification:** Internal
**Review Frequency:** Annual

---

## Purpose

This policy establishes data retention periods for all information processed by FOIA Stream, ensuring compliance with legal requirements while minimizing data held beyond its useful life.

---

## Scope

This policy applies to:
- All data stored in the FOIA Stream database
- Uploaded documents and attachments
- System logs and audit trails
- Backup copies

---

## Legal Requirements

### Federal Requirements

| Regulation | Requirement | Retention Period |
|------------|-------------|------------------|
| **FOIA** (5 U.S.C. § 552) | FOIA request files | 6 years after close |
| **Privacy Act** (5 U.S.C. § 552a) | Records about individuals | Varies by record type |
| **Federal Records Act** (44 U.S.C.) | Federal records | Per NARA schedule |
| **NARA GRS 4.2** | Transitory records | Until no longer needed |

### State Requirements

Consult applicable state retention schedules for state agency implementations.

---

## Retention Schedule

### User Account Data

| Data Type | Active Retention | Post-Deactivation | Basis |
|-----------|-----------------|-------------------|-------|
| **User profile** (email, name, phone) | While active | 2 years | Privacy Act |
| **Authentication data** (password hash) | While active | Delete on deactivation | Security |
| **Session data** | 30 days | N/A | Operational |
| **2FA secrets** | While active | Delete on deactivation | Security |
| **Login history** | 2 years | 2 years from deactivation | Security audit |

### FOIA Request Data

| Data Type | Active Retention | Post-Closure | Basis |
|-----------|-----------------|--------------|-------|
| **Request metadata** | Until closed | 6 years | FOIA, GRS |
| **Request content** | Until closed | 6 years | FOIA |
| **Submitted documents** | Until closed | 6 years | FOIA |
| **Agency responses** | Until closed | 6 years | FOIA |
| **Communication history** | Until closed | 6 years | FOIA |
| **Appeal records** | Until resolved | 6 years | FOIA |
| **Fee records** | Until paid | 6 years | Financial |

### Operational Data

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| **Audit logs** | 7 years | Compliance |
| **Application logs** | 90 days | Operational |
| **Error logs** | 90 days | Operational |
| **Performance metrics** | 1 year | Operational |
| **Security events** | 7 years | Security |

### Temporary Data

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| **Failed upload files** | 24 hours | Operational |
| **Draft requests** | 30 days | User experience |
| **Password reset tokens** | 24 hours | Security |
| **Email verification tokens** | 72 hours | Security |

---

## Retention Matrix by Table

### Database Tables

| Table | Retention Rule | Trigger Event |
|-------|---------------|---------------|
| `users` | 2 years post-deactivation | `is_active = false` |
| `sessions` | 30 days | `expires_at` passed |
| `agencies` | Permanent | N/A |
| `foia_requests` | 6 years post-closure | `status = 'closed'` |
| `documents` | 6 years post-request-closure | Parent request closed |
| `comments` | 6 years post-request-closure | Parent request closed |
| `appeals` | 6 years post-resolution | `status = 'resolved'` |
| `request_status_history` | 6 years post-request-closure | Parent request closed |
| `request_assignments` | 6 years post-request-closure | Parent request closed |
| `notifications` | 90 days | `created_at` |
| `templates` | Permanent | N/A |
| `audit_logs` | 7 years | `created_at` |
| `fee_schedules` | Permanent | N/A |

### File Storage

| Location | Retention Rule | Trigger Event |
|----------|---------------|---------------|
| `uploads/requests/` | 6 years post-request-closure | Parent request closed |
| `uploads/responses/` | 6 years post-request-closure | Parent request closed |
| `uploads/temp/` | 24 hours | `upload_time` |
| `backups/` | 1 year | `backup_date` |
| `logs/` | 90 days | `log_date` |

---

## Data Disposition

### 3.1 Secure Deletion Requirements

All data deletion must ensure:
- [ ] Complete removal from primary storage
- [ ] Removal from all backup copies (next rotation)
- [ ] No recovery possible through normal means
- [ ] Audit log entry for deletion

### 3.2 Deletion Methods

| Storage Type | Method |
|--------------|--------|
| Database records | `DELETE` with verification |
| File storage | Secure file deletion (overwrite) |
| Backups | Natural rotation (max 1 year) |
| Logs | Log rotation with deletion |

### 3.3 Deletion Exceptions

Data may be retained beyond schedule if:
- Subject to active litigation hold
- Required for ongoing investigation
- Part of active audit
- Regulatory inquiry

---

## Implementation

### 4.1 Automated Retention Jobs

```sql
-- Session cleanup (daily)
DELETE FROM sessions WHERE expires_at < datetime('now');

-- Draft request cleanup (weekly)
DELETE FROM foia_requests
WHERE status = 'draft'
AND updated_at < datetime('now', '-30 days');

-- Notification cleanup (weekly)
DELETE FROM notifications
WHERE created_at < datetime('now', '-90 days');

-- Closed request archival (monthly)
-- Flag records eligible for deletion
UPDATE foia_requests
SET retention_flag = 'eligible_for_deletion'
WHERE status = 'closed'
AND closed_at < datetime('now', '-6 years');
```

### 4.2 Manual Review Process

Before deletion of FOIA request data:
1. Generate deletion candidate report
2. Review for litigation holds
3. Verify retention period met
4. Obtain compliance officer approval
5. Execute deletion
6. Log deletion in audit trail
7. Update metrics

### 4.3 Deletion Audit Log

```sql
-- Log all retention-based deletions
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  details,
  ip_address
)
VALUES (
  NULL, -- System action
  'RETENTION_DELETE',
  '<entity_type>',
  '<entity_id>',
  '{
    "retention_policy": "<policy_reference>",
    "original_created": "<date>",
    "trigger_date": "<date>",
    "record_count": <count>,
    "approved_by": "<approver>"
  }',
  'system'
);
```

---

## Legal Holds

### 5.1 Hold Initiation

When a legal hold is required:
1. Legal counsel issues hold notice
2. Compliance officer identifies affected data
3. Data flagged in system (`legal_hold = true`)
4. Retention jobs skip flagged data
5. Document hold in legal hold register

### 5.2 Hold Release

When hold is released:
1. Legal counsel issues release notice
2. Remove hold flag from data
3. Data resumes normal retention schedule
4. Document release in register

### 5.3 Hold Tracking

```sql
-- Add legal hold flag to relevant tables
ALTER TABLE foia_requests ADD COLUMN legal_hold INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN legal_hold INTEGER DEFAULT 0;

-- Query held records
SELECT * FROM foia_requests WHERE legal_hold = 1;
```

---

## User Data Requests

### 6.1 Data Subject Access Request (DSAR)

When a user requests their data:
1. Verify user identity
2. Compile all user-related data:
   - User profile
   - FOIA requests submitted
   - Comments and communications
   - Audit log entries (anonymized)
3. Provide in portable format (JSON)
4. Complete within 30 days

### 6.2 Data Deletion Request

When a user requests account deletion:
1. Verify user identity
2. Check for active FOIA requests
3. If active requests exist:
   - Complete or withdraw requests first
   - OR anonymize requester data
4. Delete/anonymize:
   - User profile
   - Authentication data
   - Session data
5. Retain for compliance:
   - Closed requests (anonymized)
   - Audit logs (anonymized)
6. Confirm deletion to user

---

## Archival Procedures

### 7.1 Long-Term Archival

For data approaching end of retention but with historical value:
1. Identify archival candidates
2. Remove PII through anonymization
3. Export to archival format
4. Transfer to archival storage
5. Delete from production
6. Document in archival register

### 7.2 Archival Format

```json
{
  "archive_type": "foia_request_aggregate",
  "archive_date": "2025-01-XX",
  "date_range": "2019-01 to 2019-12",
  "record_count": 1500,
  "statistics": {
    "by_category": {...},
    "by_agency": {...},
    "by_status": {...},
    "average_processing_time": "15 days"
  },
  "note": "PII removed per retention policy"
}
```

---

## Monitoring & Compliance

### 8.1 Retention Metrics

| Metric | Target | Frequency |
|--------|--------|-----------|
| Expired sessions deleted | 100% daily | Daily |
| Eligible records reviewed | 100% | Monthly |
| Deletion backlog | 0 | Monthly |
| Legal hold accuracy | 100% | Quarterly |

### 8.2 Compliance Reporting

Monthly report to include:
- Records eligible for deletion
- Records deleted
- Records on legal hold
- Exceptions and justifications
- Outstanding DSARs

### 8.3 Audit

Annual audit to verify:
- Retention jobs running correctly
- No data retained beyond policy
- Legal holds properly maintained
- Deletion logs accurate

---

## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **Compliance Officer** | Policy ownership, deletion approval, reporting |
| **Database Administrator** | Retention job execution, technical implementation |
| **Legal Counsel** | Legal hold management, regulatory interpretation |
| **System Administrators** | Backup management, file system cleanup |
| **Data Stewards** | Data classification, archival decisions |

---

## Exceptions

Requests for retention exceptions must:
1. Be submitted in writing
2. Include business justification
3. Specify requested retention period
4. Be approved by Compliance Officer
5. Be documented in exception register
6. Be reviewed annually

---

## Related Documents

- Privacy Impact Assessment
- Data Classification Policy
- Backup and Recovery Procedures
- Incident Response Plan
- Legal Hold Procedures

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | Compliance | Initial policy |

---

## Appendix: Retention Quick Reference

```
┌─────────────────────────────────────────────────────────┐
│                  RETENTION QUICK REFERENCE              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User Data                                              │
│  ├── Active accounts: While active                      │
│  ├── Inactive accounts: 2 years                         │
│  └── Sessions: 30 days                                  │
│                                                         │
│  FOIA Requests                                          │
│  ├── Open requests: Until closed                        │
│  ├── Closed requests: 6 years                           │
│  └── All attachments: With parent request               │
│                                                         │
│  Operational                                            │
│  ├── Audit logs: 7 years                                │
│  ├── Application logs: 90 days                          │
│  └── Backups: 1 year                                    │
│                                                         │
│  Temporary                                              │
│  ├── Drafts: 30 days                                    │
│  ├── Temp uploads: 24 hours                             │
│  └── Reset tokens: 24 hours                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
