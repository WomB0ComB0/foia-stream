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

# FOIA Stream - Compliance Scope

> **Document Version:** 2.0
> **Last Updated:** 2025-12-25
> **Status:** Active
> **Owner:** Security & Compliance Team

---

## 1. Executive Summary

FOIA Stream is a transparency and audit application designed to bridge the gap between law-enforcement agencies and civilians by simplifying public records requests (FOIA/FOIL), automating disclosure, and centralizing government accountability information.

This document defines the compliance scope, system boundaries, data flows, and regulatory frameworks applicable to the platform.

---

## 2. In-Scope Products & Services

### 2.1 Core Platform Components

| Component | Description | Environment |
|-----------|-------------|-------------|
| **FOIA Stream API** | RESTful API for all platform operations | Production |
| **User Management System** | Authentication, authorization, session management | Production |
| **FOIA Request Wizard** | Guided request submission and tracking | Production |
| **Agency Directory** | Government agency database and contact information | Production |
| **Document Repository** | Storage for released records and body-cam footage | Production |
| **Transparency Dashboards** | Public statistics and compliance metrics | Production |

### 2.2 Environments

| Environment | Purpose | Data Classification |
|-------------|---------|---------------------|
| **Production** | Live user-facing application | Contains real PII |
| **Staging** | Pre-production testing | Synthetic/anonymized data |
| **Development** | Feature development | Synthetic data only |

---

## 3. In-Scope Data Categories

### 3.1 Personal Identifiable Information (PII)

| Data Category | Examples | Collection Purpose | Retention |
|---------------|----------|-------------------|-----------|
| **Account Data** | Email, name, password hash | User authentication | Account lifetime + 30 days |
| **Contact Information** | Email, organization | Service communication | Account lifetime |
| **Request Data** | FOIA requests, tracking info | Core service delivery | 7 years |
| **Audit Logs** | Actions, IP addresses, user agents | Security & compliance | 7 years |

### 3.2 Government Records Data

| Data Category | Examples | Source | Retention |
|---------------|----------|--------|-----------|
| **Agency Information** | FOIA contacts, response deadlines | Public records | Indefinite |
| **Released Documents** | PDFs, images, records | FOIA responses | Indefinite |
| **Body-Cam Footage** | Video files, transcripts | Agency uploads / FOIA | Per policy |
| **Statistics** | Compliance rates, response times | Aggregated data | Indefinite |

### 3.3 Data NOT in Scope

- **Protected Health Information (PHI/ePHI)**: Platform does not process healthcare data
- **Payment Card Data (PCI-DSS)**: No payment processing (nonprofit model)
- **Biometric Data**: No biometric collection or processing

---

## 4. System Boundaries

### 4.1 Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FOIA STREAM BOUNDARY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Hono      │    │   SQLite    │    │   File      │         │
│  │   API       │◄──►│   Database  │    │   Storage   │         │
│  │   Server    │    │   (Drizzle) │    │   (uploads/)│         │
│  └──────┬──────┘    └─────────────┘    └─────────────┘         │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │   Auth      │  JWT + Argon2 password hashing                │
│  │   System    │                                               │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │      EXTERNAL USERS       │
              │  • Civilians              │
              │  • Journalists            │
              │  • Researchers            │
              │  • Attorneys              │
              │  • Agency Officials       │
              └───────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Bun | Latest |
| **Framework** | Hono | 4.11.x |
| **Database** | SQLite (via Drizzle ORM) | 0.45.x |
| **Authentication** | JWT (jose) + Argon2 | 6.x / 0.44.x |
| **Validation** | Effect Schema | 3.19.x |

### 4.3 Infrastructure

| Component | Provider | Region |
|-----------|----------|--------|
| **Compute** | {{<hosting_provider>}} | {{<primary_region>}} |
| **Database** | Local SQLite file | Same as compute |
| **File Storage** | Local filesystem (`./uploads/`) | Same as compute |
| **DNS/CDN** | {{<dns_cdn_provider>}} | N/A |

---

## 5. User Roles & Access Levels

| Role | Description | Data Access |
|------|-------------|-------------|
| **Civilian** | General public users | Own requests, public records |
| **Journalist** | Press/media professionals | Own requests, public records, enhanced search |
| **Researcher** | Academic/NGO researchers | Own requests, public records, bulk export |
| **Attorney** | Legal professionals | Own requests, public records, client requests |
| **Community Advocate** | Advocacy organizations | Own requests, public records |
| **Agency Official** | Government FOIA officers | Agency requests, response management |
| **Admin** | Platform administrators | Full system access |

---

## 6. Compliance Framework Applicability

### 6.1 Applicable Regulations

| Framework | Applicability | Rationale |
|-----------|---------------|-----------|
| **SOC 2 Type I** | ✅ Required | B2B/public-facing SaaS handling user data |
| **SOC 2 Type II** | ✅ Required | Demonstrate sustained operational effectiveness |
| **ISO/IEC 27001** | ✅ Target | International ISMS standard for trust |
| **GDPR** | ✅ Required if EU users | May process EU resident data |
| **CCPA/CPRA** | ✅ Required if CA users | California resident privacy rights |
| **HIPAA** | ❌ Not Applicable | No PHI/ePHI processing |

### 6.2 Compliance Targets

```yaml
compliance_targets:
  soc2_type1: true
  soc2_type2: true
  iso27001: true
  gdpr: true
  ccpa_cpra: true
  hipaa: false
```

---

## 7. Third-Party Vendors

See `compliance/inventory/vendors.yml` for full vendor inventory.

### 7.1 Critical Vendors (Data Processors)

| Vendor | Service | Data Access | Agreement Required |
|--------|---------|-------------|-------------------|
| {{<hosting_vendor>}} | Compute/hosting | Full system access | DPA |
| {{<email_vendor>}} | Transactional email | Email addresses | DPA |
| {{<monitoring_vendor>}} | Application monitoring | Logs, metrics | DPA |

### 7.2 Sub-processors

None currently identified.

---

## 8. Exclusions

The following are explicitly **out of scope**:

1. **Mobile applications** - Web-only platform currently
2. **Third-party integrations** - No OAuth/SSO providers yet
3. **Payment processing** - Nonprofit model, no fees
4. **Healthcare data** - No PHI collection
5. **Government agency internal systems** - Only public-facing FOIA submission

---

## 9. Scope Change Management

Any changes to this scope require:

1. Review by {{<compliance_owner_name>}}
2. Impact assessment on control catalog
3. Update to relevant documentation
4. Communication to stakeholders

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | System | Initial draft |

---

## Appendix: Derive-or-Ask Items

The following items could not be derived from the repository and require input:

- `{{<compliance_owner_name>}}` - Who owns compliance for this project?
- `{{<hosting_provider>}}` - Where is this deployed? (e.g., AWS, GCP, Azure, Vercel, Railway)
- `{{<primary_region>}}` - Primary deployment region
- `{{<dns_cdn_provider>}}` - DNS/CDN provider if any
- `{{<hosting_vendor>}}` - Name of hosting vendor for vendor inventory
- `{{<email_vendor>}}` - Transactional email provider (if any)
- `{{<monitoring_vendor>}}` - APM/monitoring provider (if any)
