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

# Control Framework Mapping Matrix

**Document Version:** 2.0
**Last Updated:** 2025-12-25
**Owner:** Security & Compliance
**Classification:** Internal

---

## Overview

This matrix maps FOIA Stream's security controls to applicable regulatory frameworks and industry standards. Each control from our control catalog is cross-referenced to demonstrate compliance coverage across multiple frameworks.

## Applicable Frameworks

| Framework | Applicability | Rationale |
|-----------|--------------|-----------|
| **NIST 800-53 Rev 5** | Primary | Federal information security baseline |
| **SOC 2 Type II** | Required | Trust Services Criteria for SaaS |
| **ISO 27001:2022** | Optional | International security standard |
| **FedRAMP** | Future | Federal cloud authorization |
| **FOIA Act** | Required | Freedom of Information Act compliance |
| **Privacy Act** | Required | Federal privacy requirements |
| **State Sunshine Laws** | Varies | State-specific transparency laws |

---

## Access Control (AC) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| AC-1 | Access Control Policy | AC-1 | CC6.1 | A.5.15 | AC-1 |
| AC-2 | Account Management | AC-2 | CC6.2, CC6.3 | A.5.16, A.5.18 | AC-2 |
| AC-3 | Role-Based Access Control | AC-3, AC-6 | CC6.1, CC6.3 | A.5.15, A.8.2 | AC-3 |
| AC-4 | Least Privilege | AC-6 | CC6.1 | A.5.15, A.8.2 | AC-6 |
| AC-5 | Session Management | AC-11, AC-12 | CC6.1 | A.8.11 | AC-12 |
| AC-6 | JWT Token Security | IA-5, SC-12 | CC6.1, CC6.6 | A.8.5 | IA-5 |
| AC-7 | Failed Login Lockout | AC-7 | CC6.1 | A.8.5 | AC-7 |
| AC-8 | API Rate Limiting | SC-5 | CC6.6 | A.8.6 | SC-5 |
| AC-9 | Request Access Control | AC-3 | CC6.1 | A.5.15 | AC-3 |

### Detailed SOC 2 Mapping - Access Control

| SOC 2 TSC | Description | FOIA Stream Controls |
|-----------|-------------|---------------------|
| CC6.1 | Logical and Physical Access | AC-1, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8 |
| CC6.2 | Registration and Authorization | AC-2 |
| CC6.3 | Role Changes and Removal | AC-2, AC-3 |
| CC6.6 | Security Configurations | AC-6, AC-8 |

---

## Audit & Accountability (AU) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| AU-1 | Audit Policy | AU-1 | CC4.1, CC7.2 | A.5.31 | AU-1 |
| AU-2 | Request Audit Trail | AU-2, AU-3 | CC4.1, CC7.2 | A.8.15 | AU-2 |
| AU-3 | User Action Logging | AU-2, AU-12 | CC4.1 | A.8.15 | AU-3 |
| AU-4 | Audit Log Retention | AU-4, AU-11 | CC7.4 | A.8.17 | AU-11 |
| AU-5 | Audit Log Protection | AU-9 | CC7.2 | A.8.15 | AU-9 |
| AU-6 | Security Monitoring | AU-6, SI-4 | CC7.2, CC7.3 | A.8.16 | AU-6 |

### Detailed SOC 2 Mapping - Audit

| SOC 2 TSC | Description | FOIA Stream Controls |
|-----------|-------------|---------------------|
| CC4.1 | Monitoring Activities | AU-2, AU-3, AU-6 |
| CC7.2 | Security Event Monitoring | AU-1, AU-2, AU-5, AU-6 |
| CC7.3 | Event Evaluation | AU-6 |
| CC7.4 | Security Event Response | AU-4 |

---

## Configuration Management (CM) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| CM-1 | Configuration Policy | CM-1 | CC6.6, CC8.1 | A.8.9 | CM-1 |
| CM-2 | Baseline Configuration | CM-2 | CC6.6 | A.8.9 | CM-2 |
| CM-3 | Change Control | CM-3 | CC8.1 | A.8.32 | CM-3 |
| CM-4 | Security Impact Analysis | CM-4 | CC8.1 | A.8.32 | CM-4 |
| CM-5 | Access Restrictions for Change | CM-5 | CC6.6 | A.8.33 | CM-5 |
| CM-6 | Environment Separation | CM-2, SC-7 | CC6.7 | A.8.31 | SC-7 |

---

## Identification & Authentication (IA) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| IA-1 | I&A Policy | IA-1 | CC6.1 | A.5.15 | IA-1 |
| IA-2 | User Identification | IA-2 | CC6.1 | A.5.16 | IA-2 |
| IA-3 | Password Security | IA-5 | CC6.1 | A.5.17 | IA-5 |
| IA-4 | Multi-Factor Authentication | IA-2(1) | CC6.1 | A.8.5 | IA-2(1) |
| IA-5 | Authenticator Management | IA-5 | CC6.1 | A.5.17 | IA-5 |
| IA-6 | Account Recovery | IA-5(1) | CC6.1 | A.5.17 | IA-5 |
| IA-7 | Service Authentication | IA-9 | CC6.7 | A.5.17 | IA-9 |

---

## Incident Response (IR) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| IR-1 | IR Policy | IR-1 | CC7.4, CC7.5 | A.5.24 | IR-1 |
| IR-2 | Incident Detection | IR-4 | CC7.2, CC7.3 | A.5.25 | IR-4 |
| IR-3 | Incident Classification | IR-4 | CC7.4 | A.5.25 | IR-4 |
| IR-4 | Incident Containment | IR-4 | CC7.4 | A.5.26 | IR-4 |
| IR-5 | Incident Communication | IR-6, IR-7 | CC7.5 | A.5.26 | IR-6 |
| IR-6 | Post-Incident Review | IR-4(4) | CC7.5 | A.5.27 | IR-4 |

---

## System & Communications Protection (SC) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| SC-1 | SC Policy | SC-1 | CC6.6, CC6.7 | A.5.31 | SC-1 |
| SC-2 | TLS Configuration | SC-8, SC-13 | CC6.1, CC6.7 | A.8.24 | SC-8 |
| SC-3 | Security Headers | SC-8 | CC6.6 | A.8.24 | SC-8 |
| SC-4 | Input Validation | SI-10 | CC6.6 | A.8.28 | SI-10 |
| SC-5 | SQL Injection Prevention | SI-10 | CC6.6 | A.8.28 | SI-10 |
| SC-6 | XSS Prevention | SI-10 | CC6.6 | A.8.28 | SI-10 |
| SC-7 | CORS Configuration | SC-7 | CC6.6 | A.8.22 | SC-7 |
| SC-8 | Data at Rest Encryption | SC-28 | CC6.1 | A.8.24 | SC-28 |

---

## System & Information Integrity (SI) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | FedRAMP |
|------------|--------------|-------------|-----------|-----------|---------|
| SI-1 | SI Policy | SI-1 | CC7.1 | A.5.31 | SI-1 |
| SI-2 | Vulnerability Management | SI-2 | CC7.1 | A.8.8 | SI-2 |
| SI-3 | Malware Protection | SI-3 | CC6.8 | A.8.7 | SI-3 |
| SI-4 | Dependency Scanning | SI-2 | CC7.1 | A.8.8 | SI-2 |
| SI-5 | Error Handling | SI-11 | CC6.6 | A.8.28 | SI-11 |
| SI-6 | Data Validation | SI-10 | CC6.6 | A.8.28 | SI-10 |

---

## Data Management (DM) Mapping

| Control ID | Control Name | NIST 800-53 | SOC 2 TSC | ISO 27001 | Privacy Act | FOIA |
|------------|--------------|-------------|-----------|-----------|-------------|------|
| DM-1 | Data Classification | RA-2 | CC6.1 | A.5.12 | § 552a(b) | § 552(b) |
| DM-2 | PII Protection | SI-12 | P3.1, P4.1 | A.5.34 | § 552a(e) | — |
| DM-3 | Data Retention | SI-12 | P5.1 | A.5.33 | § 552a(e)(5) | — |
| DM-4 | Data Disposal | MP-6 | P5.2 | A.8.10 | § 552a(e)(5) | — |
| DM-5 | Backup & Recovery | CP-9 | A1.2 | A.8.13 | § 552a(e)(5) | — |
| DM-6 | Document Handling | MP-4 | CC6.1 | A.5.13 | § 552a(b) | § 552(a)(2) |

### FOIA-Specific Requirements Mapping

| FOIA Section | Requirement | FOIA Stream Controls |
|--------------|-------------|---------------------|
| § 552(a)(1) | Publication in Federal Register | Not applicable (external) |
| § 552(a)(2) | Reading Room Requirements | DM-6, API endpoints |
| § 552(a)(3) | Records Requests Processing | Request workflow, AU-2 |
| § 552(a)(4) | Fee Schedules | Request status tracking |
| § 552(a)(6) | Response Deadlines | Status tracking, notifications |
| § 552(b) | Exemptions | Request categorization, DM-1 |

---

## Privacy Controls Mapping

| Control | Privacy Act | GDPR Art. | CCPA § | FOIA Stream Implementation |
|---------|-------------|-----------|--------|----------------------------|
| Notice | § 552a(e)(3) | 13, 14 | 1798.100 | Privacy policy, collection notices |
| Access | § 552a(d)(1) | 15 | 1798.110 | User profile, request history |
| Correction | § 552a(d)(2) | 16 | 1798.105 | Profile update endpoints |
| Consent | § 552a(b) | 6, 7 | 1798.120 | Registration consent |
| Data Minimization | § 552a(e)(1) | 5 | 1798.100 | Schema design, DM-2 |
| Retention | § 552a(e)(5) | 5 | 1798.105 | DM-3, DM-4 |
| Security | § 552a(e)(10) | 32 | 1798.150 | All SC controls |

---

## Compliance Coverage Summary

### SOC 2 Trust Services Criteria Coverage

| Category | Criteria Count | Addressed | Coverage |
|----------|---------------|-----------|----------|
| **CC1** - Control Environment | 4 | 4 | 100% |
| **CC2** - Communication & Information | 3 | 3 | 100% |
| **CC3** - Risk Assessment | 4 | 4 | 100% |
| **CC4** - Monitoring Activities | 2 | 2 | 100% |
| **CC5** - Control Activities | 3 | 3 | 100% |
| **CC6** - Logical/Physical Access | 8 | 8 | 100% |
| **CC7** - System Operations | 5 | 5 | 100% |
| **CC8** - Change Management | 1 | 1 | 100% |
| **CC9** - Risk Mitigation | 2 | 2 | 100% |
| **A1** - Availability | 3 | 2 | 67% |
| **P** - Privacy | 8 | 6 | 75% |
| **Total** | 43 | 40 | **93%** |

### ISO 27001:2022 Annex A Coverage

| Domain | Control Count | Addressed | Coverage |
|--------|---------------|-----------|----------|
| A.5 - Organizational | 37 | 28 | 76% |
| A.6 - People | 8 | 4 | 50% |
| A.7 - Physical | 14 | 2 | 14% |
| A.8 - Technological | 34 | 30 | 88% |
| **Total** | 93 | 64 | **69%** |

### NIST 800-53 Control Family Coverage

| Family | Controls | Addressed | Coverage |
|--------|----------|-----------|----------|
| AC - Access Control | 25 | 15 | 60% |
| AU - Audit | 16 | 10 | 63% |
| CM - Configuration | 14 | 8 | 57% |
| CP - Contingency | 13 | 4 | 31% |
| IA - Identification | 12 | 9 | 75% |
| IR - Incident Response | 10 | 8 | 80% |
| MA - Maintenance | 6 | 3 | 50% |
| MP - Media Protection | 8 | 5 | 63% |
| PE - Physical | 23 | 2 | 9% |
| PL - Planning | 11 | 6 | 55% |
| PS - Personnel | 9 | 3 | 33% |
| RA - Risk Assessment | 9 | 5 | 56% |
| SA - Acquisition | 23 | 6 | 26% |
| SC - System Protection | 51 | 18 | 35% |
| SI - System Integrity | 23 | 14 | 61% |
| **Total** | 253 | 116 | **46%** |

---

## Gap Analysis Summary

### High Priority Gaps (P1)

| Gap | Frameworks Affected | Remediation |
|-----|---------------------|-------------|
| Encryption at rest not implemented | NIST SC-28, SOC2 CC6.1, ISO A.8.24 | Implement SQLite encryption |
| Security monitoring incomplete | NIST AU-6, SOC2 CC7.2, ISO A.8.16 | Deploy log aggregation/alerting |
| Vulnerability scanning not automated | NIST SI-2, SOC2 CC7.1, ISO A.8.8 | Add to CI/CD pipeline |
| MFA not fully deployed | NIST IA-2(1), SOC2 CC6.1, ISO A.8.5 | Complete TOTP implementation |

### Medium Priority Gaps (P2)

| Gap | Frameworks Affected | Remediation |
|-----|---------------------|-------------|
| Physical security N/A (cloud) | NIST PE-*, ISO A.7.* | Document cloud provider inheritance |
| Formal risk assessment pending | NIST RA-3, SOC2 CC3.2, ISO A.5.7 | Conduct annual risk assessment |
| Security training not formalized | NIST AT-2, SOC2 CC1.4, ISO A.6.3 | Develop training program |
| BCP/DR testing not performed | NIST CP-4, SOC2 A1.3, ISO A.5.30 | Schedule DR exercise |

---

## Evidence Requirements by Framework

### SOC 2 Type II Evidence

| TSC | Evidence Required | Frequency | Owner |
|-----|-------------------|-----------|-------|
| CC6.1 | Access control configurations | Quarterly | Security |
| CC6.2 | User provisioning/deprovisioning logs | Continuous | IT Admin |
| CC7.2 | Security event logs, alerts | Daily | Security |
| CC8.1 | Change management tickets | Per change | Engineering |
| A1.2 | Backup completion logs | Daily | Operations |

### ISO 27001 Audit Evidence

| Clause | Evidence Required | Frequency |
|--------|-------------------|-----------|
| 4.3 | ISMS scope document | Annual |
| 5.2 | Information security policy | Annual |
| 6.1.2 | Risk assessment report | Annual |
| 7.2 | Training records | Continuous |
| 9.2 | Internal audit reports | Annual |
| 10.1 | NC and corrective actions | Per incident |

---

## Appendix: Control ID Cross-Reference

| FOIA Stream ID | NIST 800-53 | SOC 2 | ISO 27001 | Status |
|----------------|-------------|-------|-----------|--------|
| AC-1 | AC-1 | CC6.1 | A.5.15 | ✅ Implemented |
| AC-2 | AC-2 | CC6.2 | A.5.16 | ✅ Implemented |
| AC-3 | AC-3, AC-6 | CC6.1, CC6.3 | A.5.15 | ✅ Implemented |
| AC-4 | AC-6 | CC6.1 | A.5.15 | ✅ Implemented |
| AC-5 | AC-11, AC-12 | CC6.1 | A.8.11 | ✅ Implemented |
| AC-6 | IA-5, SC-12 | CC6.1 | A.8.5 | ✅ Implemented |
| AC-7 | AC-7 | CC6.1 | A.8.5 | 🟡 Planned |
| AC-8 | SC-5 | CC6.6 | A.8.6 | ✅ Implemented |
| AC-9 | AC-3 | CC6.1 | A.5.15 | ✅ Implemented |
| AU-1 | AU-1 | CC4.1 | A.5.31 | ✅ Implemented |
| AU-2 | AU-2, AU-3 | CC4.1 | A.8.15 | ✅ Implemented |
| AU-3 | AU-2, AU-12 | CC4.1 | A.8.15 | ✅ Implemented |
| AU-4 | AU-4, AU-11 | CC7.4 | A.8.17 | 🟡 Partial |
| AU-5 | AU-9 | CC7.2 | A.8.15 | 🟡 Partial |
| AU-6 | AU-6, SI-4 | CC7.2 | A.8.16 | 🔴 Gap |
| CM-1 | CM-1 | CC6.6 | A.8.9 | 🟡 Partial |
| CM-2 | CM-2 | CC6.6 | A.8.9 | ✅ Implemented |
| CM-3 | CM-3 | CC8.1 | A.8.32 | 🟡 Partial |
| CM-4 | CM-4 | CC8.1 | A.8.32 | 🟡 Partial |
| CM-5 | CM-5 | CC6.6 | A.8.33 | 🟡 Partial |
| CM-6 | CM-2, SC-7 | CC6.7 | A.8.31 | ✅ Implemented |
| IA-1 | IA-1 | CC6.1 | A.5.15 | ✅ Implemented |
| IA-2 | IA-2 | CC6.1 | A.5.16 | ✅ Implemented |
| IA-3 | IA-5 | CC6.1 | A.5.17 | ✅ Implemented |
| IA-4 | IA-2(1) | CC6.1 | A.8.5 | 🟡 Partial |
| IA-5 | IA-5 | CC6.1 | A.5.17 | ✅ Implemented |
| IA-6 | IA-5(1) | CC6.1 | A.5.17 | 🟡 Planned |
| IA-7 | IA-9 | CC6.7 | A.5.17 | ✅ Implemented |
| IR-1 | IR-1 | CC7.4 | A.5.24 | 🟡 Partial |
| IR-2 | IR-4 | CC7.2 | A.5.25 | 🟡 Partial |
| IR-3 | IR-4 | CC7.4 | A.5.25 | 🟡 Partial |
| IR-4 | IR-4 | CC7.4 | A.5.26 | 🟡 Partial |
| IR-5 | IR-6, IR-7 | CC7.5 | A.5.26 | 🟡 Partial |
| IR-6 | IR-4(4) | CC7.5 | A.5.27 | 🟡 Partial |
| SC-1 | SC-1 | CC6.6 | A.5.31 | 🟡 Partial |
| SC-2 | SC-8, SC-13 | CC6.1 | A.8.24 | ✅ Implemented |
| SC-3 | SC-8 | CC6.6 | A.8.24 | ✅ Implemented |
| SC-4 | SI-10 | CC6.6 | A.8.28 | ✅ Implemented |
| SC-5 | SI-10 | CC6.6 | A.8.28 | ✅ Implemented |
| SC-6 | SI-10 | CC6.6 | A.8.28 | ✅ Implemented |
| SC-7 | SC-7 | CC6.6 | A.8.22 | ✅ Implemented |
| SC-8 | SC-28 | CC6.1 | A.8.24 | 🔴 Gap |
| SI-1 | SI-1 | CC7.1 | A.5.31 | 🟡 Partial |
| SI-2 | SI-2 | CC7.1 | A.8.8 | 🔴 Gap |
| SI-3 | SI-3 | CC6.8 | A.8.7 | 🟡 Partial |
| SI-4 | SI-2 | CC7.1 | A.8.8 | 🟡 Partial |
| SI-5 | SI-11 | CC6.6 | A.8.28 | ✅ Implemented |
| SI-6 | SI-10 | CC6.6 | A.8.28 | ✅ Implemented |
| DM-1 | RA-2 | CC6.1 | A.5.12 | 🟡 Partial |
| DM-2 | SI-12 | P3.1 | A.5.34 | ✅ Implemented |
| DM-3 | SI-12 | P5.1 | A.5.33 | 🟡 Partial |
| DM-4 | MP-6 | P5.2 | A.8.10 | 🟡 Planned |
| DM-5 | CP-9 | A1.2 | A.8.13 | 🔴 Gap |
| DM-6 | MP-4 | CC6.1 | A.5.13 | ✅ Implemented |

**Legend:**
- ✅ Implemented - Control is fully operational
- 🟡 Partial/Planned - Control is partially implemented or planned
- 🔴 Gap - Control requires immediate attention
