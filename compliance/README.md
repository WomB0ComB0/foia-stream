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

## Overview

This document provides an index to the comprehensive compliance framework for FOIA Stream, a Freedom of Information Act request management system.

**Compliance Framework Version:** 2.1
**Last Updated:** 2025-12-25
**Owner:** Security & Compliance Team

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [Scope Definition](scope.md) | System boundaries and compliance scope |
| [System Overview](system_overview.md) | Architecture and data flows |
| [Control Catalog](control_catalog.yml) | Security controls (42 controls) |
| [Mapping Matrix](mapping_matrix.md) | Framework cross-reference |
| [Gap Analysis](gap_analysis.md) | Gaps and remediation roadmap |
| [Evidence Plan](evidence_plan.yml) | Evidence collection requirements |
| [PII Data Flow](pii-data-flow-analysis.md) | PII handling and encryption |

### Runbooks
| Document | Purpose |
|----------|---------|
| [Incident Response](runbooks/incident-response.md) | Security incident procedures |
| [Access Management](runbooks/access-management.md) | User lifecycle management |
| [Change Management](runbooks/change-management.md) | Change control procedures |
| [Breach Notification](runbooks/breach-notification.md) | Data breach response |

### Privacy
| Document | Purpose |
|----------|---------|
| [Privacy Impact Assessment](privacy/privacy-impact-assessment.md) | PIA for the system |
| [Data Retention Policy](privacy/data-retention-policy.md) | Data lifecycle management |

### Inventory
| Document | Purpose |
|----------|---------|
| [Vendor Inventory](inventory/vendors.yml) | Third-party dependencies |

---

## Compliance Posture Summary

### Overall Status: **Excellent (93%)**

| Domain | Score | Status |
|--------|-------|--------|
| Access Control | 95% | ✅ Excellent |
| Audit & Accountability | 92% | ✅ Excellent |
| Configuration Management | 85% | ✅ Good |
| Identification & Authentication | 98% | ✅ Excellent |
| Incident Response | 88% | ✅ Good |
| System Protection | 95% | ✅ Excellent |
| System Integrity | 90% | ✅ Good |
| Data Management | 92% | ✅ Excellent |

### Control Scores

| Score Level | Count | Percentage |
|-------------|-------|------------|
| 3 - Operating | 9 | 21% |
| 2 - Implemented | 15 | 36% |
| 1 - Documented | 4 | 10% |
| 0 - Missing | 14 | 33% |

### Framework Coverage

| Framework | Coverage |
|-----------|----------|
| SOC 2 Type II | 67% ready |
| ISO 27001:2022 | 76% |
| NIST 800-53 | 72% |
| GDPR | Partial |
| CCPA | In Progress |

---

## ✅ Closed Gaps (P1/P2)

| ID | Gap | Resolution |
|----|-----|------------|
| GAP-001 | Encryption at rest | ✅ AES-256-GCM field encryption |
| GAP-002 | Security monitoring | ✅ Real-time monitoring service |
| GAP-003 | Vulnerability scanning | ✅ CI/CD security pipeline |
| GAP-004 | MFA completion | ✅ Full TOTP + backup codes |
| GAP-005 | Backup & DR | ✅ Automated backup service |
| GAP-007 | Rate Limiting | ✅ Rate limiting + account lockout |
| GAP-009 | Data Retention | ✅ Automated purge service |
| GAP-014 | Security Headers | ✅ ZAP header checks in CI |

## 🔄 Remaining Gaps

| ID | Gap | Priority | Target |
|----|-----|----------|--------|
| GAP-006 | IR Plan Completion | P2 | Q1 2025 |
| GAP-008 | Change Management Docs | P2 | Q1 2025 |
| GAP-010 | Audit Log Immutability | P2 | Q2 2025 |
| GAP-011 | Security Training | P3 | Q2 2025 |
| GAP-012 | Risk Assessment | P3 | Q2 2025 |
| GAP-013 | Account Recovery | P3 | Q2 2025 |
| GAP-015 | Data Classification | P3 | Q2 2025 |

See [Gap Analysis](gap_analysis.md) for full details.

---

## Evidence Collection Schedule

| Frequency | Items |
|-----------|-------|
| Daily | Backup logs |
| Weekly | Dependency audits |
| Monthly | Access logs, vulnerability scans, MFA metrics |
| Quarterly | Access reviews, configuration audits, security scans |
| Annual | Policy reviews, risk assessments, training |

See [Evidence Plan](evidence_plan.yml) for full requirements.

---

## Directory Structure

```
compliance/
├── scope.md                    # Compliance scope definition
├── system_overview.md          # Architecture documentation
├── control_catalog.yml         # Security control catalog
├── mapping_matrix.md           # Framework mapping
├── gap_analysis.md             # Gap analysis & roadmap
├── evidence_plan.yml           # Evidence requirements
├── evidence/                   # Evidence storage
├── inventory/
│   └── vendors.yml             # Vendor inventory
├── privacy/
│   ├── privacy-impact-assessment.md
│   └── data-retention-policy.md
└── runbooks/
    ├── incident-response.md
    ├── access-management.md
    └── change-management.md
```

---

## Contacts

| Role | Responsibility |
|------|----------------|
| Security Lead | Control implementation, monitoring |
| Compliance Officer | Policy, evidence, audits |
| Engineering Lead | Technical remediation |
| Operations | Backups, deployments |

---

## Review Schedule

- **Monthly:** Gap remediation progress
- **Quarterly:** Compliance posture assessment
- **Annually:** Full framework review

---

## Related Documents

- [Compliance Rubric](rubric.md) - Scoring criteria and framework requirements
- [README](README.md) - Application documentation
