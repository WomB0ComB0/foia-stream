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

# FOIA Stream - System Overview

> **Document Version:** 2.0
> **Last Updated:** 2025-12-25
> **Status:** Active

---

## 1. System Description

FOIA Stream is a web-based transparency and audit platform that enables:

- **Citizens** to submit, track, and manage Freedom of Information Act (FOIA) requests
- **Agencies** to receive, process, and respond to public records requests
- **Researchers** to access aggregated transparency data and statistics
- **The Public** to browse released documents and agency compliance metrics

The system serves as a centralized hub for government accountability, reducing friction between requesters and agencies while maintaining security and privacy.

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   Web Clients   │
                                    │  (Browsers)     │
                                    └────────┬────────┘
                                             │
                                             │ HTTPS
                                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                        FOIA STREAM SYSTEM                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     APPLICATION LAYER                         │ │
│  │                                                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │   Hono      │  │  Security   │  │   Rate      │          │ │
│  │  │   Router    │  │  Headers    │  │   Limiting  │          │ │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘          │ │
│  │         │                                                     │ │
│  │         ▼                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │                    API ROUTES (/api/v1)                  │ │ │
│  │  │  • /auth     - Authentication & Sessions                 │ │ │
│  │  │  • /requests - FOIA Request Management                   │ │ │
│  │  │  • /agencies - Agency Directory                          │ │ │
│  │  │  • /templates - Request Templates                        │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                              │                                │ │
│  └──────────────────────────────┼────────────────────────────────┘ │
│                                 │                                  │
│  ┌──────────────────────────────┼────────────────────────────────┐ │
│  │                     SERVICE LAYER                             │ │
│  │                              │                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │   Auth      │  │   FOIA      │  │   Agency    │          │ │
│  │  │   Service   │  │   Service   │  │   Service   │          │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │ │
│  │         │                │                │                   │ │
│  │  ┌─────────────┐  ┌─────────────┐                            │ │
│  │  │   Template  │  │   Audit     │                            │ │
│  │  │   Service   │  │   Logging   │                            │ │
│  │  └──────┬──────┘  └──────┬──────┘                            │ │
│  │         │                │                                    │ │
│  └─────────┼────────────────┼────────────────────────────────────┘ │
│            │                │                                      │
│  ┌─────────┼────────────────┼────────────────────────────────────┐ │
│  │                     DATA LAYER                                │ │
│  │                              │                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │                  Drizzle ORM                             │ │ │
│  │  └─────────────────────────┬───────────────────────────────┘ │ │
│  │                            │                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐                            │ │
│  │  │   SQLite    │  │   File      │                            │ │
│  │  │   Database  │  │   Storage   │                            │ │
│  │  │  (./data/)  │  │ (./uploads/)│                            │ │
│  │  └─────────────┘  └─────────────┘                            │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Descriptions

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Hono Router** | Hono 4.x | HTTP routing and middleware orchestration |
| **Security Headers** | `hono/secure-headers` | CSP, X-Frame-Options, etc. |
| **Rate Limiting** | Configurable | Prevent abuse and DDoS |
| **Auth Service** | JWT + Argon2 | Authentication, session management |
| **FOIA Service** | Custom | Request CRUD, status tracking |
| **Agency Service** | Custom | Agency directory management |
| **Template Service** | Custom | Request template management |
| **Audit Logging** | Custom | Security event tracking |
| **Drizzle ORM** | drizzle-orm 0.45.x | Type-safe database operations |
| **SQLite** | bun:sqlite | Persistent data storage |
| **File Storage** | Local FS | Document and media storage |

---

## 3. Data Flow Diagrams

### 3.1 User Authentication Flow

```
┌──────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │     │  Auth API   │     │Auth Service │     │ Database │
└────┬─────┘     └──────┬──────┘     └──────┬──────┘     └────┬─────┘
     │                  │                   │                 │
     │  POST /auth/register                 │                 │
     │─────────────────►│                   │                 │
     │                  │  Validate Input   │                 │
     │                  │─────────────────► │                 │
     │                  │                   │  Hash Password  │
     │                  │                   │  (Argon2id)     │
     │                  │                   │────────────────►│
     │                  │                   │                 │ INSERT user
     │                  │                   │◄────────────────│
     │                  │◄──────────────────│                 │
     │  201 Created     │                   │                 │
     │◄─────────────────│                   │                 │
     │                  │                   │                 │
     │  POST /auth/login                    │                 │
     │─────────────────►│                   │                 │
     │                  │  Verify Credentials                 │
     │                  │─────────────────► │                 │
     │                  │                   │────────────────►│
     │                  │                   │◄────────────────│
     │                  │                   │  Verify Password│
     │                  │                   │  Generate JWT   │
     │                  │                   │  Create Session │
     │                  │◄──────────────────│                 │
     │  200 OK + JWT    │                   │                 │
     │◄─────────────────│                   │                 │
```

### 3.2 FOIA Request Submission Flow

```
┌──────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │     │ Request API │     │FOIA Service │     │ Database │
└────┬─────┘     └──────┬──────┘     └──────┬──────┘     └────┬─────┘
     │                  │                   │                 │
     │  POST /requests  │                   │                 │
     │  + JWT Header    │                   │                 │
     │─────────────────►│                   │                 │
     │                  │  Auth Middleware  │                 │
     │                  │  (Verify JWT)     │                 │
     │                  │                   │                 │
     │                  │  Validate Request │                 │
     │                  │─────────────────► │                 │
     │                  │                   │  Create Request │
     │                  │                   │────────────────►│
     │                  │                   │◄────────────────│
     │                  │                   │  Log Audit Event│
     │                  │                   │────────────────►│
     │                  │◄──────────────────│                 │
     │  201 Created     │                   │                 │
     │◄─────────────────│                   │                 │
```

### 3.3 Document Access Flow

```
┌──────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│  Client  │     │ Document API│     │   Service   │     │  Storage │
└────┬─────┘     └──────┬──────┘     └──────┬──────┘     └────┬─────┘
     │                  │                   │                 │
     │  GET /documents/:id                  │                 │
     │─────────────────►│                   │                 │
     │                  │  Check Permissions│                 │
     │                  │─────────────────► │                 │
     │                  │                   │  Fetch Metadata │
     │                  │                   │────────────────►│
     │                  │                   │◄────────────────│
     │                  │                   │  Check isPublic │
     │                  │                   │  or User Access │
     │                  │◄──────────────────│                 │
     │  200 OK / 403    │                   │                 │
     │◄─────────────────│                   │                 │
     │                  │                   │                 │
     │                  │                   │  Log Access     │
     │                  │                   │  (Audit Trail)  │
```

---

## 4. Database Schema Overview

### 4.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     USERS       │       │    SESSIONS     │       │   AUDIT_LOGS    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ user_id (FK)    │       │ id (PK)         │
│ email           │       │ id (PK)         │       │ user_id (FK)    │
│ password_hash   │       │ token           │       │ action          │
│ role            │       │ expires_at      │       │ resource_type   │
│ first_name      │       └─────────────────┘       │ resource_id     │
│ last_name       │                                 │ details         │
│ organization    │◄────────────────────────────────│ ip_address      │
│ is_verified     │                                 │ user_agent      │
│ is_anonymous    │                                 └─────────────────┘
│ two_factor_*    │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│  FOIA_REQUESTS  │       │    AGENCIES     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │──────►│ name            │
│ agency_id (FK)  │       │ abbreviation    │
│ status          │       │ jurisdiction    │
│ category        │       │ state/city      │
│ title           │       │ foia_email      │
│ description     │       │ response_days   │
│ tracking_number │       └────────┬────────┘
│ submitted_at    │                │
│ due_date        │                │ 1:N
│ is_public       │                ▼
└────────┬────────┘       ┌─────────────────┐
         │                │  AGENCY_STATS   │
         │ 1:N            ├─────────────────┤
         ▼                │ agency_id (FK)  │
┌─────────────────┐       │ total_requests  │
│    DOCUMENTS    │       │ compliance_rate │
├─────────────────┤       └─────────────────┘
│ id (PK)         │
│ request_id (FK) │
│ type            │       ┌─────────────────┐
│ file_name       │       │    COMMENTS     │
│ file_path       │◄──────├─────────────────┤
│ is_redacted     │       │ document_id(FK) │
│ is_public       │       │ user_id (FK)    │
└─────────────────┘       │ content         │
                          │ timestamp       │
                          └─────────────────┘
```

### 4.2 Table Summary

| Table | Purpose | Row Count Est. | Sensitivity |
|-------|---------|----------------|-------------|
| `users` | User accounts | 1K-100K | High (PII) |
| `sessions` | Active JWT sessions | 100-10K | High |
| `agencies` | Government agency directory | 10K-50K | Low |
| `foia_requests` | Request records | 10K-1M | Medium |
| `documents` | Released documents | 10K-500K | Varies |
| `comments` | User annotations | 10K-100K | Medium |
| `appeals` | Appeal records | 1K-50K | Medium |
| `audit_logs` | Security events | 100K-10M | High |
| `request_templates` | Reusable templates | 100-1K | Low |
| `agency_stats` | Aggregated metrics | 10K-50K | Low |

---

## 5. Security Controls Summary

### 5.1 Authentication & Authorization

| Control | Implementation | Status |
|---------|----------------|--------|
| Password Hashing | Argon2id with secure parameters | ✅ Implemented |
| Session Management | JWT with expiration | ✅ Implemented |
| Role-Based Access | 7 user roles with permissions | ✅ Implemented |
| Two-Factor Auth | TOTP support (schema ready) | 🔄 Partial |

### 5.2 Transport Security

| Control | Implementation | Status |
|---------|----------------|--------|
| HTTPS Enforcement | TLS required in production | {{<tls_status>}} |
| Security Headers | CSP, X-Frame-Options, etc. | ✅ Implemented |
| CORS Policy | Configurable origins | ✅ Implemented |

### 5.3 Data Protection

| Control | Implementation | Status |
|---------|----------------|--------|
| Encryption at Rest | SQLite encryption | {{<encryption_status>}} |
| Input Validation | Effect Schema | ✅ Implemented |
| SQL Injection Prevention | Drizzle ORM parameterization | ✅ Implemented |

### 5.4 Audit & Monitoring

| Control | Implementation | Status |
|---------|----------------|--------|
| Audit Logging | `audit_logs` table | ✅ Implemented |
| Request Logging | Hono logger middleware | ✅ Implemented |
| Error Handling | Global error handler | ✅ Implemented |

---

## 6. Integration Points

### 6.1 Inbound

| Interface | Protocol | Authentication | Purpose |
|-----------|----------|----------------|---------|
| REST API | HTTPS | JWT Bearer | All client operations |

### 6.2 Outbound

| Service | Protocol | Purpose | Data Shared |
|---------|----------|---------|-------------|
| None currently | - | - | - |

---

## 7. Backup & Recovery

### 7.1 Current State

| Component | Backup Method | Frequency | Retention |
|-----------|---------------|-----------|-----------|
| SQLite Database | {{<backup_method>}} | {{<backup_freq>}} | {{<retention>}} |
| File Uploads | {{<backup_method>}} | {{<backup_freq>}} | {{<retention>}} |

### 7.2 Recovery Objectives

| Metric | Target | Current |
|--------|--------|---------|
| RPO (Recovery Point Objective) | {{<rpo_target>}} | {{<current_rpo>}} |
| RTO (Recovery Time Objective) | {{<rto_target>}} | {{<current_rto>}} |

---

## 8. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | System | Initial draft |
