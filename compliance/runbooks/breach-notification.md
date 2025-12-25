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

# Breach Notification Procedure

**Document ID:** SEC-001
**Version:** 1.0.0
**Last Updated:** December 25, 2025
**Classification:** Internal

---

## 1. Purpose

This procedure establishes the process for identifying, responding to, and reporting security breaches involving personal information, in compliance with:

- **NY General Business Law § 899-aa** (Data Breach Notification)
- **NY SHIELD Act** (Stop Hacks and Improve Electronic Data Security)
- **GDPR Articles 33-34** (if applicable to EU data subjects)

---

## 2. Scope

This procedure applies to any unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of private information maintained by FOIA Stream.

### 2.1 Definition of Private Information (NY Law)

Private information includes personal information (name or other identifier) combined with any of:

- Social Security number
- Driver's license or non-driver ID number
- Account number, credit/debit card number (with security code, access code, or password)
- Biometric information
- Username/email combined with password or security question answer

### 2.2 FOIA Stream Data Categories

| Category | Contains Private Info | Breach Notification Required |
|----------|----------------------|------------------------------|
| User accounts (email + password hash) | ⚠️ Potentially | Yes, if password hash compromised |
| User names | No (alone) | No |
| FOIA request content | ⚠️ Potentially | Depends on content |
| Session IP addresses | No (not combined) | No |
| Audit logs | ⚠️ Potentially | Depends on content |

---

## 3. Incident Response Team

### 3.1 Roles

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Incident Commander** | Overall coordination, decision authority | [TBD - Project Lead] |
| **Technical Lead** | Investigation, containment, forensics | [TBD - Lead Developer] |
| **Communications Lead** | User notification, public statements | [TBD] |
| **Legal Counsel** | Regulatory reporting, liability assessment | [TBD - External] |

### 3.2 Escalation Thresholds

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | Active exfiltration of private information | Immediate (< 1 hour) |
| **High** | Confirmed unauthorized access to private info | < 4 hours |
| **Medium** | Suspected breach, investigation needed | < 24 hours |
| **Low** | Security event, no private info exposure confirmed | < 72 hours |

---

## 4. Breach Response Phases

### Phase 1: Detection & Initial Assessment (0-4 hours)

#### 4.1.1 Detection Sources

- Security monitoring alerts (`security-monitoring.service.ts`)
- User reports
- External notification (researcher, law enforcement)
- Anomaly detection in audit logs

#### 4.1.2 Initial Assessment Checklist

- [ ] What systems/data are affected?
- [ ] Is the breach ongoing or contained?
- [ ] What type of private information is involved?
- [ ] How many individuals are potentially affected?
- [ ] What is the likely cause (external attack, insider, misconfiguration)?

#### 4.1.3 Documentation

Log all findings in the incident ticket immediately. Include:

```typescript
// Example audit log entry
await auditLogService.log({
  action: 'SECURITY_INCIDENT',
  severity: 'critical',
  details: {
    incidentId: 'INC-2025-001',
    detectedAt: new Date().toISOString(),
    affectedSystems: ['users', 'sessions'],
    estimatedAffectedUsers: 1500,
    status: 'investigating',
  },
});
```

### Phase 2: Containment (4-24 hours)

#### 4.2.1 Immediate Actions

- [ ] Revoke compromised credentials/tokens
- [ ] Block suspicious IP addresses (use `cidr-banlist.service.ts`)
- [ ] Disable affected user accounts if necessary
- [ ] Preserve forensic evidence (database snapshots, logs)
- [ ] Rotate encryption keys if key material exposed

#### 4.2.2 Technical Containment Commands

```bash
# Force logout all users (invalidate all sessions)
# Run in production with caution
curl -X POST https://api.foiastream.com/admin/security/invalidate-all-sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Block attacker IP range
curl -X POST https://api.foiastream.com/admin/security/ban-cidr \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"cidr": "192.0.2.0/24", "reason": "INC-2025-001"}'
```

### Phase 3: Investigation (24-72 hours)

#### 4.3.1 Forensic Analysis

- Review audit logs for the affected time period
- Identify initial access vector
- Determine full scope of accessed data
- Identify all affected users

#### 4.3.2 Root Cause Analysis

Document the vulnerability or failure that allowed the breach:

| Factor | Finding |
|--------|---------|
| Vulnerability | [e.g., SQL injection in X endpoint] |
| Time of exploitation | [timestamp] |
| Duration of exposure | [hours/days] |
| Data accessed | [specific tables/fields] |
| Remediation | [patch applied, config changed] |

### Phase 4: Notification (ASAP, within regulatory deadlines)

#### 4.4.1 NY Notification Requirements (GBL § 899-aa)

**Timeline:** "In the most expedient time possible and without unreasonable delay"

**Method:** Written or electronic notice including:

1. Description of the breach in general terms
2. Date range of the breach (if known)
3. Types of personal information involved
4. Contact information for FOIA Stream
5. Contact information for major credit reporting agencies
6. Toll-free numbers for FTC, NY AG

**Recipients:**

- [ ] All affected NY residents
- [ ] NY Attorney General (if > 5,000 NY residents affected)
- [ ] NYS Department of State (same threshold)
- [ ] Consumer reporting agencies (if > 5,000 affected)

#### 4.4.2 Notification Template

```
Subject: Important Security Notice from FOIA Stream

Dear [User Name],

We are writing to inform you of a security incident that may have affected
your personal information.

WHAT HAPPENED
On [DATE], we discovered unauthorized access to our systems that occurred
between [START DATE] and [END DATE].

WHAT INFORMATION WAS INVOLVED
The following types of information may have been accessed:
- [List specific data types]

WHAT WE ARE DOING
We have taken the following steps:
- [Containment measures]
- [Security improvements]
- [Offering credit monitoring if applicable]

WHAT YOU CAN DO
We recommend that you:
- Change your FOIA Stream password immediately
- Monitor your accounts for suspicious activity
- [Additional recommendations based on data type]

FOR MORE INFORMATION
Contact us at: security@foiastream.com
NY Attorney General: 1-800-771-7755
Federal Trade Commission: 1-877-FTC-HELP

Sincerely,
FOIA Stream Security Team
```

#### 4.4.3 GDPR Notification (if applicable)

**Supervisory Authority:** Within 72 hours of awareness

**Data Subjects:** "Without undue delay" if high risk to rights/freedoms

### Phase 5: Remediation & Recovery (Ongoing)

#### 4.5.1 Technical Remediation

- [ ] Patch/fix the vulnerability
- [ ] Implement additional security controls
- [ ] Conduct security review of related systems
- [ ] Update security monitoring rules

#### 4.5.2 Process Improvements

- [ ] Update incident response procedure
- [ ] Conduct post-incident review (blameless postmortem)
- [ ] Implement lessons learned
- [ ] Schedule follow-up security assessment

---

## 5. Regulatory Contacts

### New York

- **NY Attorney General:** 1-800-771-7755
- **Online Complaint Form:** https://ag.ny.gov/consumer-frauds-bureau/complaint-forms
- **Written Notice:**
  ```
  Office of the Attorney General
  Bureau of Internet and Technology
  28 Liberty Street
  New York, NY 10005
  ```

### Federal

- **FTC:** 1-877-FTC-HELP (382-4357)
- **FBI IC3:** https://www.ic3.gov/

### Credit Bureaus

- **Equifax:** 1-800-685-1111
- **Experian:** 1-888-397-3742
- **TransUnion:** 1-800-888-4213

---

## 6. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-25 | FOIA Stream Team | Initial version |

---

## 7. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Lead | | | |
| Legal Review | | | |
