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

# Access Management Runbook

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Owner:** IT Administration
**Classification:** Internal
**Review Frequency:** Annual

---

## Purpose

This runbook provides procedures for managing user access throughout the identity lifecycle, including provisioning, role changes, access reviews, and deprovisioning.

---

## User Roles

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| `public` | Unauthenticated users | View public request status |
| `requester` | General public users | Create/view own requests, upload documents |
| `agency_staff` | Agency employees | Process assigned requests, respond |
| `agency_admin` | Agency administrators | Manage agency staff, view all agency requests |
| `admin` | System administrators | Full system access, user management |
| `auditor` | Compliance auditors | Read-only access to all data, audit logs |
| `compliance_officer` | Compliance team | Compliance reporting, policy management |

### Role Hierarchy

```
admin
  └── agency_admin
        └── agency_staff
  └── compliance_officer
  └── auditor
requester (public users)
```

---

## User Provisioning

### 1. New User Request

**Trigger:** User self-registration or admin-initiated creation

#### Self-Registration Flow (Requesters)

```
1. User submits registration form
   - Required: email, password, first_name, last_name
   - Optional: phone, organization

2. System validates:
   - Email format and uniqueness
   - Password complexity (min 8 chars, Effect Schema validation)

3. User account created:
   - Role: requester (default)
   - Status: active
   - 2FA: disabled (optional enrollment)

4. Audit log entry created:
   - Action: CREATE
   - Entity: user
   - Details: { role: 'requester', created_by: 'self' }
```

#### Admin-Provisioned Users (Staff/Admin)

**Pre-requisites:**
- [ ] Approved access request from manager
- [ ] Background check complete (if required)
- [ ] Role justification documented

**Procedure:**

```bash
# 1. Create user via API (admin authenticated)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "email": "user@agency.gov",
    "password": "<temporary_password>",
    "firstName": "John",
    "lastName": "Doe",
    "role": "agency_staff"
  }'

# 2. Assign to agency (if agency staff/admin)
# Direct database update or API endpoint
UPDATE users SET agency_id = '<agency_id>' WHERE email = 'user@agency.gov';

# 3. Send welcome email with temporary password
# (Email integration required)
```

**Post-Provisioning Checklist:**
- [ ] User can log in successfully
- [ ] Correct role assigned
- [ ] Agency association correct (if applicable)
- [ ] User completes password reset
- [ ] MFA enrollment initiated (if required for role)
- [ ] Access request ticket closed

---

## Role Changes

### 2. Role Modification

**Trigger:** Promotion, transfer, or permission change

**Pre-requisites:**
- [ ] Approved change request from manager
- [ ] Business justification documented
- [ ] No conflicting roles (separation of duties)

**Procedure:**

```sql
-- 1. Verify current role
SELECT id, email, role, agency_id FROM users WHERE email = '<user_email>';

-- 2. Update role
UPDATE users
SET role = '<new_role>', updated_at = CURRENT_TIMESTAMP
WHERE email = '<user_email>';

-- 3. Log the change
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (
  '<admin_user_id>',
  'UPDATE',
  'user',
  '<target_user_id>',
  '{"field": "role", "old_value": "<old_role>", "new_value": "<new_role>", "ticket": "<TICKET_ID>"}',
  '<admin_ip>'
);
```

**Validation:**
```sql
-- Verify role change
SELECT id, email, role, updated_at FROM users WHERE email = '<user_email>';

-- Verify audit log
SELECT * FROM audit_logs
WHERE entity_type = 'user' AND entity_id = '<user_id>'
ORDER BY created_at DESC LIMIT 1;
```

### 3. Agency Transfer

**Trigger:** User transfers to different agency

**Procedure:**

```sql
-- 1. Remove from current agency
UPDATE users SET agency_id = NULL WHERE email = '<user_email>';

-- 2. Reassign any open requests (if agency_staff)
UPDATE foia_requests
SET assigned_to = NULL
WHERE assigned_to = '<user_id>' AND status NOT IN ('completed', 'closed');

-- 3. Assign to new agency
UPDATE users SET agency_id = '<new_agency_id>' WHERE email = '<user_email>';

-- 4. Log the transfer
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (
  '<admin_user_id>',
  'UPDATE',
  'user',
  '<target_user_id>',
  '{"field": "agency_id", "old_value": "<old_agency>", "new_value": "<new_agency>", "ticket": "<TICKET_ID>"}',
  '<admin_ip>'
);
```

---

## User Deprovisioning

### 4. Account Deactivation

**Trigger:** Termination, resignation, or extended leave

**Immediate Actions (within 1 hour of notification):**

```sql
-- 1. Disable the account
UPDATE users
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE email = '<user_email>';

-- 2. Terminate all active sessions
DELETE FROM sessions WHERE user_id = '<user_id>';

-- 3. Reassign open work items
UPDATE foia_requests
SET assigned_to = NULL, status = 'pending_assignment'
WHERE assigned_to = '<user_id>' AND status IN ('assigned', 'in_progress');

-- 4. Log the deactivation
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (
  '<admin_user_id>',
  'DEACTIVATE',
  'user',
  '<target_user_id>',
  '{"reason": "<termination|resignation|leave>", "ticket": "<TICKET_ID>", "effective_date": "<DATE>"}',
  '<admin_ip>'
);
```

**Verification:**

```sql
-- Verify account disabled
SELECT id, email, is_active, updated_at FROM users WHERE email = '<user_email>';

-- Verify no active sessions
SELECT COUNT(*) FROM sessions WHERE user_id = '<user_id>';

-- Verify no assigned work
SELECT COUNT(*) FROM foia_requests WHERE assigned_to = '<user_id>' AND status NOT IN ('completed', 'closed');
```

### 5. Account Deletion (GDPR/Privacy Request)

**Trigger:** User data deletion request

**Pre-requisites:**
- [ ] Verified identity of requester
- [ ] Retention requirements reviewed
- [ ] Legal/compliance approval (if needed)

**Procedure:**

```sql
-- 1. Export user data for requester (if requested)
SELECT * FROM users WHERE id = '<user_id>';
SELECT * FROM foia_requests WHERE requester_id = '<user_id>';
SELECT * FROM comments WHERE user_id = '<user_id>';

-- 2. Anonymize audit logs (retain for compliance)
UPDATE audit_logs
SET user_id = NULL, details = json_set(details, '$.anonymized', true)
WHERE user_id = '<user_id>';

-- 3. Delete user sessions
DELETE FROM sessions WHERE user_id = '<user_id>';

-- 4. Delete or anonymize comments
UPDATE comments
SET user_id = NULL, content = '[Content removed at user request]'
WHERE user_id = '<user_id>';

-- 5. Reassign or anonymize requests
UPDATE foia_requests
SET requester_id = NULL, requester_email = '[Removed]', requester_name = '[Removed]'
WHERE requester_id = '<user_id>' AND status IN ('completed', 'closed');

-- 6. Delete user account
DELETE FROM users WHERE id = '<user_id>';

-- 7. Log the deletion
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (
  '<admin_user_id>',
  'DELETE',
  'user',
  '<deleted_user_id>',
  '{"reason": "user_request", "ticket": "<TICKET_ID>", "data_exported": <true|false>}',
  '<admin_ip>'
);
```

---

## Access Reviews

### 6. Periodic Access Review

**Frequency:** Quarterly
**Scope:** All active accounts
**Owner:** Security Team + Department Managers

#### Review Process

```
Week 1: Generate access report
Week 2: Manager review and certification
Week 3: Remediation of identified issues
Week 4: Documentation and sign-off
```

#### Access Report Generation

```sql
-- Generate access review report
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  a.name as agency_name,
  u.is_active,
  u.created_at,
  u.last_login_at,
  CASE
    WHEN u.last_login_at < date('now', '-90 days') THEN 'INACTIVE_90_DAYS'
    WHEN u.last_login_at < date('now', '-30 days') THEN 'INACTIVE_30_DAYS'
    ELSE 'ACTIVE'
  END as activity_status,
  (SELECT COUNT(*) FROM foia_requests WHERE assigned_to = u.id AND status = 'completed') as completed_requests
FROM users u
LEFT JOIN agencies a ON u.agency_id = a.id
WHERE u.is_active = 1
ORDER BY u.role, a.name, u.email;
```

#### Review Checklist

For each account, verify:
- [ ] User still requires access
- [ ] Role appropriate for current job function
- [ ] Agency assignment correct
- [ ] Last login within 90 days (or documented exception)
- [ ] MFA enabled (for privileged roles)

#### Remediation Actions

| Finding | Action |
|---------|--------|
| User no longer with organization | Immediate deactivation |
| Role exceeds job requirements | Role downgrade |
| No login in 90+ days | Disable and notify manager |
| Missing MFA (privileged role) | Enforce enrollment deadline |

---

## Emergency Access

### 7. Emergency Access Procedure

**Trigger:** Urgent business need outside normal process

**Authorization:** Requires two approvals (IC + Executive)

**Procedure:**

```
1. Document emergency justification
2. Obtain verbal approval from Incident Commander
3. Obtain verbal approval from Executive Sponsor
4. Grant temporary access (max 24 hours)
5. Log emergency access grant
6. Follow up with formal access request within 24 hours
7. Revoke access when emergency resolved
```

**Logging Emergency Access:**

```sql
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (
  '<granting_admin_id>',
  'EMERGENCY_ACCESS',
  'user',
  '<recipient_user_id>',
  '{
    "justification": "<emergency_reason>",
    "approved_by": ["<IC_name>", "<Executive_name>"],
    "expires_at": "<24_hours_from_now>",
    "role_granted": "<temporary_role>"
  }',
  '<admin_ip>'
);
```

---

## MFA Management

### 8. MFA Enrollment

**Required for:** admin, agency_admin, compliance_officer, auditor

**Procedure:**

```
1. User logs in to account
2. Navigate to Security Settings
3. Select "Enable Two-Factor Authentication"
4. Scan QR code with authenticator app
5. Enter verification code
6. Save backup codes securely
```

**Database State:**

```sql
-- MFA enabled state
UPDATE users
SET two_factor_enabled = 1, two_factor_secret = '<encrypted_secret>'
WHERE id = '<user_id>';
```

### 9. MFA Reset

**Trigger:** User lost device or authenticator

**Pre-requisites:**
- [ ] Identity verification (ID check or manager confirmation)
- [ ] Ticket with justification

**Procedure:**

```sql
-- 1. Disable MFA temporarily
UPDATE users
SET two_factor_enabled = 0, two_factor_secret = NULL
WHERE id = '<user_id>';

-- 2. Terminate active sessions
DELETE FROM sessions WHERE user_id = '<user_id>';

-- 3. Log the reset
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (
  '<admin_user_id>',
  'MFA_RESET',
  'user',
  '<target_user_id>',
  '{"reason": "<lost_device|other>", "ticket": "<TICKET_ID>", "verified_by": "<method>"}',
  '<admin_ip>'
);

-- 4. Notify user to re-enroll immediately
```

---

## Audit Log Queries

### Useful Queries for Access Management

```sql
-- All access changes in last 30 days
SELECT * FROM audit_logs
WHERE entity_type = 'user'
AND created_at > date('now', '-30 days')
ORDER BY created_at DESC;

-- Failed login attempts
SELECT user_id, ip_address, created_at, details
FROM audit_logs
WHERE action = 'LOGIN_FAILED'
ORDER BY created_at DESC;

-- Users with privileged roles
SELECT id, email, role, created_at, last_login_at
FROM users
WHERE role IN ('admin', 'agency_admin', 'compliance_officer', 'auditor');

-- Inactive accounts (90+ days no login)
SELECT id, email, role, last_login_at
FROM users
WHERE is_active = 1
AND (last_login_at < date('now', '-90 days') OR last_login_at IS NULL);

-- Recent role changes
SELECT
  al.created_at,
  u.email as changed_by,
  al.entity_id as target_user_id,
  al.details
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.entity_type = 'user'
AND json_extract(al.details, '$.field') = 'role'
ORDER BY al.created_at DESC;
```

---

## Appendix: Access Request Form Template

```markdown
# Access Request Form

**Request Date:** _______________
**Requester Name:** _______________
**Requester Email:** _______________

## Request Type
[ ] New User Account
[ ] Role Change
[ ] Agency Transfer
[ ] Additional Permissions
[ ] Account Reactivation

## User Details
- **User Email:** _______________
- **Full Name:** _______________
- **Department:** _______________
- **Manager Name:** _______________

## Access Requested
- **Role:** [ ] requester [ ] agency_staff [ ] agency_admin [ ] admin [ ] auditor [ ] compliance_officer
- **Agency:** _______________
- **Effective Date:** _______________
- **End Date (if temporary):** _______________

## Business Justification
_______________________________________________
_______________________________________________

## Approvals
- [ ] Manager Approval: _______________ Date: _______________
- [ ] Security Review: _______________ Date: _______________
- [ ] Compliance Review (if privileged): _______________ Date: _______________

## Completion
- [ ] Access Provisioned By: _______________ Date: _______________
- [ ] User Notified: [ ] Yes [ ] No
- [ ] Ticket Closed: _______________
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | IT Admin | Initial version |
