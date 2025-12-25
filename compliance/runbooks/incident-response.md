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

# Incident Response Runbook

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Owner:** Security Team
**Classification:** Internal
**Review Frequency:** Annual

---

## Purpose

This runbook provides step-by-step procedures for detecting, responding to, and recovering from security incidents affecting the FOIA Stream application.

---

## Incident Classification

### Severity Levels

| Level | Name | Description | Response Time | Examples |
|-------|------|-------------|---------------|----------|
| **SEV-1** | Critical | Active breach, data exfiltration, system compromise | 15 minutes | Unauthorized access to database, malware, ransomware |
| **SEV-2** | High | Potential breach, service disruption | 1 hour | Failed intrusion attempt, DDoS, authentication bypass |
| **SEV-3** | Medium | Security policy violation, suspicious activity | 4 hours | Policy violations, unusual access patterns |
| **SEV-4** | Low | Minor issue, informational | 24 hours | Misconfigurations, failed scans, low-risk vulnerabilities |

### Incident Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Unauthorized Access** | Illegitimate access to systems or data | Compromised credentials, privilege escalation |
| **Data Breach** | Unauthorized disclosure of data | PII exposure, document leakage |
| **Malware** | Malicious software infection | Virus, ransomware, cryptominer |
| **Denial of Service** | Service availability disruption | DDoS, resource exhaustion |
| **Insider Threat** | Malicious or negligent insider activity | Data theft, sabotage |
| **Phishing/Social Engineering** | Deceptive attempts to gain access | Credential phishing, pretexting |

---

## Roles and Responsibilities

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Incident Commander (IC)** | Overall incident coordination, decision authority | [TBD] |
| **Security Lead** | Technical investigation, containment | [TBD] |
| **Engineering Lead** | System remediation, recovery | [TBD] |
| **Communications Lead** | Internal/external communications | [TBD] |
| **Legal/Compliance** | Regulatory notifications, legal review | [TBD] |

---

## Phase 1: Detection & Triage

### 1.1 Detection Sources

- [ ] Security monitoring alerts (AU-6)
- [ ] User reports
- [ ] Audit log anomalies
- [ ] Third-party notifications
- [ ] Vulnerability scan findings

### 1.2 Initial Triage Steps

```
┌─────────────────────────────────────────────────────────┐
│ 1. Acknowledge alert/report within 15 minutes           │
│ 2. Create incident ticket with timestamp                │
│ 3. Assess initial severity (SEV-1 to SEV-4)            │
│ 4. Identify affected systems and data                   │
│ 5. Notify Incident Commander if SEV-1 or SEV-2         │
│ 6. Begin documentation in incident log                  │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Triage Questions

- What systems are affected?
- What data may be impacted?
- Is the incident ongoing or contained?
- What is the potential business impact?
- Are there regulatory notification requirements?

### 1.4 Escalation Matrix

| Severity | Notify Immediately | Notify Within 1 Hour |
|----------|-------------------|---------------------|
| SEV-1 | IC, Security Lead, Engineering Lead, Legal | Executive Team |
| SEV-2 | Security Lead, Engineering Lead | IC |
| SEV-3 | Security Lead | Engineering Lead |
| SEV-4 | Log only | Security Lead (if pattern) |

---

## Phase 2: Containment

### 2.1 Immediate Containment Actions

#### For Compromised User Account
```bash
# 1. Disable the user account
UPDATE users SET is_active = 0 WHERE email = '<compromised_email>';

# 2. Revoke all active sessions
DELETE FROM sessions WHERE user_id = '<user_id>';

# 3. Log the containment action
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
VALUES (NULL, 'SECURITY_CONTAINMENT', 'user', '<user_id>',
        '{"reason": "Account compromised - incident <TICKET_ID>"}', 'system');
```

#### For Suspected Data Breach
```bash
# 1. Identify affected records
SELECT * FROM audit_logs
WHERE user_id = '<suspect_user_id>'
AND created_at > '<breach_start_time>'
ORDER BY created_at;

# 2. Export affected request IDs for assessment
SELECT DISTINCT entity_id FROM audit_logs
WHERE entity_type = 'foia_request'
AND user_id = '<suspect_user_id>';
```

#### For API Abuse/DDoS
```bash
# 1. Identify offending IP addresses
# Check application logs for high-frequency requests

# 2. Block IP at firewall/load balancer level
# (Infrastructure-specific commands)

# 3. Temporarily increase rate limiting
# Update env: RATE_LIMIT_MAX=10, RATE_LIMIT_WINDOW_MS=60000
```

### 2.2 Containment Checklist

- [ ] Isolate affected systems (if necessary)
- [ ] Disable compromised accounts
- [ ] Revoke compromised credentials/tokens
- [ ] Block malicious IPs
- [ ] Preserve evidence (logs, snapshots)
- [ ] Document all containment actions

### 2.3 Evidence Preservation

```bash
# 1. Export audit logs for incident timeframe
sqlite3 data/foia-stream.db << EOF
.mode json
.output evidence/incident-<TICKET_ID>/audit_logs.json
SELECT * FROM audit_logs
WHERE created_at BETWEEN '<start_time>' AND '<end_time>';
EOF

# 2. Backup current database state
cp data/foia-stream.db evidence/incident-<TICKET_ID>/db_snapshot.db

# 3. Export application logs
cp logs/*.log evidence/incident-<TICKET_ID>/

# 4. Calculate checksums for integrity
sha256sum evidence/incident-<TICKET_ID>/* > evidence/incident-<TICKET_ID>/checksums.txt
```

---

## Phase 3: Eradication

### 3.1 Root Cause Analysis

Determine:
- How did the attacker gain access?
- What vulnerabilities were exploited?
- What systems/data were accessed?
- Is the threat still present?

### 3.2 Eradication Steps

#### Credential Compromise
1. Force password reset for affected user
2. Rotate JWT_SECRET if token-based attack
3. Review and revoke API keys if applicable
4. Check for persistence mechanisms

#### Vulnerability Exploitation
1. Identify and patch the vulnerability
2. Scan for similar vulnerabilities
3. Review code for related issues
4. Update dependencies if applicable

#### Malware/Unauthorized Code
1. Identify all affected files
2. Restore from known-good backup
3. Scan all systems for IOCs
4. Review access logs for unauthorized changes

### 3.3 Eradication Checklist

- [ ] Root cause identified
- [ ] Vulnerability patched/mitigated
- [ ] Malicious artifacts removed
- [ ] Credentials rotated (if applicable)
- [ ] System integrity verified

---

## Phase 4: Recovery

### 4.1 Recovery Steps

```
┌─────────────────────────────────────────────────────────┐
│ 1. Verify eradication complete                          │
│ 2. Restore systems to normal operation                  │
│ 3. Re-enable affected accounts (with new credentials)   │
│ 4. Monitor for signs of persistent threat               │
│ 5. Validate system functionality                        │
│ 6. Update monitoring rules                              │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Database Recovery (if needed)

```bash
# 1. Stop the application
pkill -f "bun run"

# 2. Restore from backup
cp backups/foia-stream-<DATE>.db data/foia-stream.db

# 3. Apply any migrations since backup
bun run db:push

# 4. Restart application
bun run start

# 5. Verify data integrity
sqlite3 data/foia-stream.db "PRAGMA integrity_check;"
```

### 4.3 Recovery Checklist

- [ ] Systems restored to operational state
- [ ] Data integrity verified
- [ ] User accounts re-enabled as appropriate
- [ ] Enhanced monitoring in place
- [ ] Business operations resumed

---

## Phase 5: Post-Incident Review

### 5.1 Post-Incident Review (PIR) Timeline

| Activity | Timeline |
|----------|----------|
| Initial incident summary | Within 24 hours |
| PIR meeting scheduled | Within 5 business days |
| PIR report completed | Within 10 business days |
| Remediation items tracked | Ongoing |

### 5.2 PIR Meeting Agenda

1. Timeline of events
2. What worked well
3. What could be improved
4. Root cause analysis findings
5. Remediation recommendations
6. Action item assignments

### 5.3 PIR Report Template

```markdown
# Post-Incident Review: [INCIDENT_ID]

## Incident Summary
- **Date/Time:**
- **Duration:**
- **Severity:**
- **Category:**
- **Systems Affected:**
- **Data Affected:**

## Timeline
| Time | Event |
|------|-------|
| | |

## Root Cause
[Description of root cause]

## Impact Assessment
- Users affected:
- Data records exposed:
- Business impact:
- Regulatory implications:

## What Went Well
-

## Areas for Improvement
-

## Action Items
| ID | Description | Owner | Due Date | Status |
|----|-------------|-------|----------|--------|
| | | | | |

## Lessons Learned
-
```

---

## Communication Templates

### Internal Notification (SEV-1/SEV-2)

```
SUBJECT: [SECURITY INCIDENT] - [Brief Description] - SEV-[X]

INCIDENT ID: [TICKET_ID]
SEVERITY: SEV-[X]
STATUS: [Active/Contained/Resolved]

SUMMARY:
[Brief description of the incident]

AFFECTED SYSTEMS:
- [System 1]
- [System 2]

CURRENT ACTIONS:
- [Action 1]
- [Action 2]

NEXT UPDATE: [Time]

INCIDENT COMMANDER: [Name]
```

### User Notification (Data Breach)

```
SUBJECT: Important Security Notice from FOIA Stream

Dear [User Name],

We are writing to inform you of a security incident that may have
affected your account/information.

WHAT HAPPENED:
[Description]

WHAT INFORMATION WAS INVOLVED:
[Types of data]

WHAT WE ARE DOING:
[Actions taken]

WHAT YOU CAN DO:
- Change your password immediately
- Review your account activity
- Contact us with any concerns

We sincerely apologize for any inconvenience.

[Contact Information]
```

---

## Appendix A: Contact List

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| Incident Commander | TBD | | | |
| Security Lead | TBD | | | |
| Engineering Lead | TBD | | | |
| Legal | TBD | | | |
| Executive Sponsor | TBD | | | |

---

## Appendix B: External Contacts

| Organization | Purpose | Contact | SLA |
|--------------|---------|---------|-----|
| [Hosting Provider] | Infrastructure issues | | |
| [Legal Counsel] | Regulatory guidance | | |
| [Cyber Insurance] | Breach notification | | |
| [Law Enforcement] | Criminal activity | Local FBI field office | |

---

## Appendix C: Regulatory Notification Requirements

| Regulation | Notification Requirement | Timeline |
|------------|-------------------------|----------|
| FOIA/Privacy Act | Agency head, OMB (if major) | 1 hour (major), 7 days (other) |
| State Breach Laws | Affected individuals, AG | Varies by state (typically 30-60 days) |
| FISMA | US-CERT | 1 hour (major incidents) |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | Security Team | Initial version |
