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

# Privacy Impact Assessment (PIA)

**System Name:** FOIA Stream
**Assessment Date:** 2025-01-XX
**Assessor:** Compliance Officer
**Document Version:** 1.0
**Classification:** Internal

---

## Executive Summary

This Privacy Impact Assessment evaluates the collection, use, and protection of personally identifiable information (PII) within the FOIA Stream application. The system processes FOIA requests which inherently involve personal information from requesters and potentially sensitive government records.

### Key Findings

| Category | Risk Level | Status |
|----------|------------|--------|
| Data Collection | Medium | Appropriate |
| Data Storage | Medium | Needs Improvement |
| Data Sharing | Low | Appropriate |
| Data Retention | Medium | Policy Needed |
| Subject Rights | Low | Implemented |

### Overall Privacy Risk: **Medium**

---

## 1. System Description

### 1.1 Purpose

FOIA Stream facilitates the submission, tracking, and management of Freedom of Information Act requests. The system enables:

- Public users to submit FOIA requests
- Agency staff to process and respond to requests
- Administrators to manage users and system configuration
- Compliance officers to monitor and audit activities

### 1.2 Legal Authority

- Freedom of Information Act, 5 U.S.C. § 552
- Privacy Act of 1974, 5 U.S.C. § 552a
- E-Government Act of 2002
- Applicable state sunshine laws

### 1.3 System Boundaries

| Component | In Scope | Description |
|-----------|----------|-------------|
| Web Application | Yes | Hono-based API server |
| Database | Yes | SQLite database |
| File Storage | Yes | Uploaded documents |
| Authentication | Yes | JWT-based auth system |
| Email Notifications | Planned | Not yet implemented |
| External APIs | No | No third-party data sharing |

---

## 2. Data Inventory

### 2.1 Personal Data Collected

| Data Element | Category | Source | Purpose | Legal Basis |
|--------------|----------|--------|---------|-------------|
| Email Address | Contact PII | User input | Account identification, communication | Consent, Legal obligation |
| Name (First/Last) | Biographical PII | User input | Identification, correspondence | Consent |
| Phone Number | Contact PII | User input (optional) | Alternative contact | Consent |
| Organization | Affiliation | User input (optional) | Statistical tracking | Consent |
| Password Hash | Authentication | User input | Access control | Consent |
| IP Address | Technical | Automatic | Security, audit | Legitimate interest |
| User Agent | Technical | Automatic | Security, debugging | Legitimate interest |
| 2FA Secret | Authentication | System generated | Multi-factor auth | Consent |

### 2.2 Request-Related Data

| Data Element | Category | Sensitivity | Retention |
|--------------|----------|-------------|-----------|
| Request Subject | Content | Variable | Per retention policy |
| Request Description | Content | Variable | Per retention policy |
| Requested Records | Content | Variable | Per retention policy |
| Requester Category | Classification | Low | Per retention policy |
| Fee Waiver Justification | Content | Medium | Per retention policy |
| Uploaded Documents | Content | Variable | Per retention policy |
| Agency Responses | Content | Variable | Per retention policy |

### 2.3 Sensitive Data Considerations

The system may process:
- **Requester identities** seeking records about themselves (Privacy Act requests)
- **Journalist identities** which may require heightened protection
- **Whistleblower-related requests** requiring confidentiality
- **Records containing third-party PII** in agency responses

---

## 3. Data Flow Analysis

### 3.1 Collection Points

```
┌─────────────────────────────────────────────────────────┐
│                    DATA COLLECTION                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User Registration                                      │
│  ├── Email (required)                                   │
│  ├── Password (required)                                │
│  ├── First Name (required)                              │
│  ├── Last Name (required)                               │
│  ├── Phone (optional)                                   │
│  └── Organization (optional)                            │
│                                                         │
│  FOIA Request Submission                                │
│  ├── Request Subject (required)                         │
│  ├── Description (required)                             │
│  ├── Category (required)                                │
│  ├── Agency (required)                                  │
│  ├── Fee Waiver Request (optional)                      │
│  └── Document Uploads (optional)                        │
│                                                         │
│  Automatic Collection                                   │
│  ├── IP Address (every request)                         │
│  ├── User Agent (every request)                         │
│  ├── Timestamps (every action)                          │
│  └── Session Data (authenticated users)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Processing

| Process | Input | Output | Actors |
|---------|-------|--------|--------|
| Registration | User data | Account record | Public user |
| Authentication | Credentials | JWT token, session | User, system |
| Request Creation | Request details | FOIA request record | Requester |
| Request Assignment | Request ID | Assignment record | Agency admin |
| Request Processing | Request + response | Status update, documents | Agency staff |
| Audit Logging | All actions | Audit log entries | System |

### 3.3 Data Storage

| Data Type | Storage Location | Encryption | Backup |
|-----------|------------------|------------|--------|
| User accounts | SQLite: users table | At rest: Planned | TBD |
| Sessions | SQLite: sessions table | At rest: Planned | TBD |
| Requests | SQLite: foia_requests table | At rest: Planned | TBD |
| Documents | File system: uploads/ | At rest: Planned | TBD |
| Audit logs | SQLite: audit_logs table | At rest: Planned | TBD |

### 3.4 Data Sharing

| Recipient | Data Shared | Purpose | Legal Basis |
|-----------|-------------|---------|-------------|
| Assigned Agency | Request details | Processing | Legal obligation |
| Requester | Request status, responses | Fulfillment | Legal obligation |
| Administrators | All data (as needed) | System management | Legitimate interest |
| Law Enforcement | As legally required | Legal compliance | Legal obligation |

**Note:** No data is shared with third-party commercial entities.

---

## 4. Privacy Principles Assessment

### 4.1 Notice (Transparency)

| Requirement | Status | Gap |
|-------------|--------|-----|
| Privacy policy published | 🔴 Gap | No privacy policy page |
| Collection notice at registration | 🔴 Gap | No notice displayed |
| Purpose explanation | 🔴 Gap | Not documented for users |
| Third-party disclosure notice | ✅ Met | N/A - no third-party sharing |

**Remediation:** Create and publish privacy policy; add collection notices to registration form.

### 4.2 Choice & Consent

| Requirement | Status | Gap |
|-------------|--------|-----|
| Consent at registration | 🟡 Partial | Implicit consent only |
| Opt-out for optional fields | ✅ Met | Optional fields clearly marked |
| Consent for communications | 🔴 Gap | No email preferences |
| Consent withdrawal mechanism | 🔴 Gap | No self-service option |

**Remediation:** Add explicit consent checkbox; implement email preference management; add account deletion option.

### 4.3 Access & Correction

| Requirement | Status | Gap |
|-------------|--------|-----|
| Users can view their data | ✅ Met | Profile and request history available |
| Users can correct their data | 🟡 Partial | Profile update available, limited fields |
| Export data capability | 🔴 Gap | No data export feature |
| Third-party data access | ✅ Met | N/A |

**Remediation:** Add data export feature; expand editable profile fields.

### 4.4 Data Minimization

| Requirement | Status | Gap |
|-------------|--------|-----|
| Only necessary data collected | ✅ Met | Optional fields clearly marked |
| Purpose limitation | ✅ Met | Data used only for stated purposes |
| Data not retained beyond need | 🔴 Gap | No automated retention enforcement |

**Remediation:** Implement data retention automation.

### 4.5 Security

| Requirement | Status | Gap |
|-------------|--------|-----|
| Encryption in transit | ✅ Met | TLS enforced |
| Encryption at rest | 🔴 Gap | Database not encrypted |
| Access controls | ✅ Met | RBAC implemented |
| Audit logging | ✅ Met | Comprehensive audit trail |
| Breach detection | 🔴 Gap | No automated monitoring |

**Remediation:** Implement database encryption; deploy security monitoring.

### 4.6 Accountability

| Requirement | Status | Gap |
|-------------|--------|-----|
| Privacy officer designated | 🔴 Gap | No formal designation |
| Staff training | 🔴 Gap | No privacy training program |
| Vendor assessment | ✅ Met | No third-party data processors |
| Incident response | 🟡 Partial | IR plan exists, not privacy-specific |

**Remediation:** Designate privacy officer; create privacy training; update IR plan for privacy incidents.

---

## 5. Risk Assessment

### 5.1 Risk Matrix

| Risk | Likelihood | Impact | Risk Level | Mitigation |
|------|------------|--------|------------|------------|
| Unauthorized access to PII | Medium | High | **High** | MFA, encryption, monitoring |
| Data breach disclosure | Low | High | **Medium** | Encryption, IR plan |
| Excessive data collection | Low | Low | **Low** | Data minimization review |
| Data retention violation | Medium | Medium | **Medium** | Automated retention |
| Inadequate consent | Medium | Medium | **Medium** | Consent mechanism |
| Subject access request failure | Low | Medium | **Low** | Data export feature |

### 5.2 Specific Privacy Risks

#### Risk 1: Requester Identity Exposure
- **Description:** Identity of requesters seeking sensitive records could be exposed
- **Impact:** Retaliation, discrimination, safety concerns
- **Likelihood:** Low
- **Mitigation:**
  - Strict access controls on requester data
  - Audit logging of all access
  - Encryption at rest
  - Staff training on confidentiality

#### Risk 2: Accumulated Request Profiling
- **Description:** Pattern analysis of requests could reveal personal interests/investigations
- **Impact:** Privacy violation, chilling effect on FOIA usage
- **Likelihood:** Medium
- **Mitigation:**
  - Data minimization (avoid linking requests unnecessarily)
  - Access restrictions on aggregate data
  - Purpose limitation on analytics

#### Risk 3: Third-Party PII in Records
- **Description:** Agency responses may contain PII of third parties
- **Impact:** Unauthorized disclosure of third-party data
- **Likelihood:** Medium
- **Mitigation:**
  - Agency responsibility for redaction
  - Document handling procedures
  - Access controls on response documents

---

## 6. Privacy Controls

### 6.1 Technical Controls

| Control | Description | Status |
|---------|-------------|--------|
| Authentication | Password + optional 2FA | ✅ Implemented |
| Authorization | Role-based access control | ✅ Implemented |
| Encryption (Transit) | TLS 1.3 | ✅ Implemented |
| Encryption (Rest) | Database encryption | 🔴 Planned |
| Session Management | Expiring JWT tokens | ✅ Implemented |
| Audit Logging | All actions logged | ✅ Implemented |
| Input Validation | Effect Schema | ✅ Implemented |
| Data Masking | PII masking in logs | 🟡 Partial |

### 6.2 Administrative Controls

| Control | Description | Status |
|---------|-------------|--------|
| Privacy Policy | Published policy | 🔴 Gap |
| Staff Training | Privacy awareness | 🔴 Gap |
| Incident Response | Privacy breach procedures | 🟡 Partial |
| Data Retention | Automated enforcement | 🔴 Gap |
| Access Reviews | Quarterly reviews | 🟡 Planned |
| Vendor Management | Third-party assessments | ✅ N/A |

### 6.3 Physical Controls

| Control | Description | Status |
|---------|-------------|--------|
| Data Center Security | Cloud provider controls | ✅ Inherited |
| Media Disposal | Secure deletion procedures | 🔴 Gap |

---

## 7. Recommendations

### High Priority (Immediate)

1. **Publish Privacy Policy**
   - Create comprehensive privacy policy
   - Display at registration and in footer
   - Include data retention information
   - Deadline: 30 days

2. **Implement Encryption at Rest**
   - Encrypt SQLite database
   - Implement key management
   - Deadline: 60 days

3. **Add Consent Mechanism**
   - Explicit consent checkbox at registration
   - Record consent timestamp
   - Deadline: 30 days

### Medium Priority (90 days)

4. **Data Export Feature**
   - Allow users to export their data
   - JSON format recommended
   - Include all user-related data

5. **Account Deletion**
   - Self-service account deletion
   - Or documented request process
   - Handle data retention requirements

6. **Privacy Training**
   - Develop privacy awareness training
   - Require for all staff handling PII
   - Annual refresh

### Lower Priority (6 months)

7. **Enhanced Logging Controls**
   - Implement PII masking in logs
   - Log access logging
   - Anomaly detection

8. **Retention Automation**
   - Automated data purging
   - Retention policy enforcement
   - Deletion confirmation logs

---

## 8. Compliance Mapping

### Privacy Act (5 U.S.C. § 552a)

| Requirement | Section | Status |
|-------------|---------|--------|
| Notice | (e)(3) | 🔴 Gap |
| Access | (d)(1) | ✅ Met |
| Amendment | (d)(2) | 🟡 Partial |
| Records accuracy | (e)(5) | ✅ Met |
| Security | (e)(10) | 🟡 Partial |
| Collection limits | (e)(1) | ✅ Met |

### GDPR Alignment (if applicable)

| Principle | Article | Status |
|-----------|---------|--------|
| Lawfulness | 6 | ✅ Met |
| Purpose limitation | 5(1)(b) | ✅ Met |
| Data minimization | 5(1)(c) | ✅ Met |
| Accuracy | 5(1)(d) | ✅ Met |
| Storage limitation | 5(1)(e) | 🔴 Gap |
| Integrity/confidentiality | 5(1)(f) | 🟡 Partial |
| Accountability | 5(2) | 🟡 Partial |

---

## 9. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| System Owner | | | |
| Privacy Officer | | | |
| Security Officer | | | |
| Legal Counsel | | | |

---

## 10. Review Schedule

- **Next Review:** 12 months from approval
- **Trigger Events:** Major system changes, new data types, incidents

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | Compliance | Initial assessment |
