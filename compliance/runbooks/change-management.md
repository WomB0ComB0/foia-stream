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

# Change Management Runbook

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Owner:** Engineering Team
**Classification:** Internal
**Review Frequency:** Annual

---

## Purpose

This runbook provides procedures for managing changes to the FOIA Stream application, including code changes, configuration updates, infrastructure modifications, and database migrations.

---

## Change Categories

### Change Types

| Type | Description | Approval | Lead Time |
|------|-------------|----------|-----------|
| **Standard** | Pre-approved, low-risk changes | Automated | Same day |
| **Normal** | Routine changes requiring review | Single approver | 2-3 days |
| **Significant** | Major features, security changes | Multiple approvers | 1+ week |
| **Emergency** | Critical fixes for incidents | Post-approval | Immediate |

### Risk Classification

| Risk Level | Criteria | Examples |
|------------|----------|----------|
| **Low** | Minimal impact, easily reversible | Documentation, logging changes |
| **Medium** | Moderate impact, planned rollback | New API endpoints, UI changes |
| **High** | Significant impact, complex rollback | Database schema, auth changes |
| **Critical** | System-wide impact, difficult recovery | Infrastructure, encryption |

---

## Standard Change Process

### Pre-Approved Changes

The following are pre-approved and can be deployed without CAB review:

- [ ] Documentation updates (README, comments)
- [ ] Log message changes
- [ ] Test additions/modifications
- [ ] Dependency patch updates (security)
- [ ] CSS/styling changes (non-breaking)
- [ ] Environment variable additions (non-security)

**Process:**

```
1. Create feature branch
2. Make changes
3. Run tests: bun test
4. Create PR
5. Pass CI checks
6. Self-merge (or single reviewer)
7. Deploy to staging → production
```

---

## Normal Change Process

### 1. Change Request

**Trigger:** Feature development, bug fixes, improvements

#### Change Request Template

```markdown
# Change Request: [TITLE]

## Change ID: CHG-XXXX
## Requestor: [Name]
## Date: YYYY-MM-DD

### Description
[Detailed description of the change]

### Business Justification
[Why is this change needed?]

### Technical Details
- **Components Affected:** [app, db, api, etc.]
- **Files Modified:** [list]
- **New Dependencies:** [if any]
- **Database Changes:** [ ] Yes [ ] No

### Risk Assessment
- **Risk Level:** [ ] Low [ ] Medium [ ] High [ ] Critical
- **Impact:** [User-facing, API, internal]
- **Rollback Plan:** [How to revert]

### Testing Plan
- [ ] Unit tests added/updated
- [ ] Integration tests
- [ ] Manual testing checklist
- [ ] Performance impact assessed

### Deployment Plan
- **Target Environment:** [ ] Staging [ ] Production
- **Deployment Window:** [Date/time]
- **Deployment Method:** [ ] Automated [ ] Manual
- **Downtime Required:** [ ] Yes [ ] No

### Approvals
- [ ] Technical Review: ____________ Date: ______
- [ ] Security Review (if applicable): ____________ Date: ______
- [ ] QA Sign-off: ____________ Date: ______
```

### 2. Development Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Create feature branch from main                      │
│    git checkout -b feature/CHG-XXXX-description         │
│                                                         │
│ 2. Implement changes                                    │
│    - Follow coding standards                            │
│    - Add/update tests                                   │
│    - Update documentation                               │
│                                                         │
│ 3. Local testing                                        │
│    bun test                                             │
│    bun run dev (manual testing)                         │
│                                                         │
│ 4. Create Pull Request                                  │
│    - Link to change request                             │
│    - Complete PR template                               │
│    - Request reviewers                                  │
│                                                         │
│ 5. Code Review                                          │
│    - Address feedback                                   │
│    - Obtain approvals                                   │
│                                                         │
│ 6. Merge and Deploy                                     │
│    - Squash merge to main                               │
│    - Deploy to staging                                  │
│    - Verify in staging                                  │
│    - Deploy to production                               │
└─────────────────────────────────────────────────────────┘
```

### 3. Code Review Requirements

| Change Type | Required Reviewers |
|-------------|-------------------|
| Standard | 1 engineer (any) |
| Normal | 1 senior engineer |
| Significant | 2 engineers + security review |
| Database changes | DBA + 1 engineer |
| Security-related | Security team + 1 engineer |

#### Code Review Checklist

- [ ] Code follows project standards
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities introduced
- [ ] No performance regressions
- [ ] Documentation updated
- [ ] Error handling appropriate
- [ ] Logging sufficient for debugging
- [ ] Database queries optimized

---

## Database Change Process

### Schema Migrations

**Risk Level:** High
**Required Approvals:** DBA + Engineering Lead

#### Migration Workflow

```bash
# 1. Create migration
bunx drizzle-kit generate:sqlite --name=description_of_change

# 2. Review generated SQL
cat drizzle/*.sql

# 3. Test migration locally
bun run db:push

# 4. Verify data integrity
sqlite3 data/foia-stream.db "PRAGMA integrity_check;"

# 5. Test rollback (if applicable)
# Manual SQL to reverse changes

# 6. Create backup before production migration
cp data/foia-stream.db backups/pre-migration-$(date +%Y%m%d).db

# 7. Apply to production
bun run db:push

# 8. Verify production data
sqlite3 data/foia-stream.db "SELECT COUNT(*) FROM <affected_table>;"
```

#### Migration Checklist

- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] Rollback script prepared
- [ ] Production backup created
- [ ] Deployment window scheduled (low-traffic)
- [ ] Monitoring in place for errors

#### Migration Log Template

```markdown
# Migration Log: [MIGRATION_NAME]

## Migration ID: [0000_name.sql]
## Date: YYYY-MM-DD HH:MM
## Executed By: [Name]

### Pre-Migration State
- Row counts: [table: count]
- Database size: [MB]

### Migration SQL
```sql
[Include migration SQL]
```

### Post-Migration State
- Row counts: [table: count]
- Database size: [MB]
- Execution time: [seconds]

### Verification
- [ ] Schema updated correctly
- [ ] Data integrity verified
- [ ] Application functions correctly
- [ ] No errors in logs

### Issues Encountered
[Document any issues]
```

---

## Configuration Changes

### Environment Variables

**Risk Level:** Medium to High
**Location:** `.env` or environment configuration

#### Adding New Environment Variables

```
1. Add to .env.example with description
2. Update src/config/env.ts schema
3. Add validation with Effect Schema
4. Update deployment configuration
5. Document in README
```

**Example: Adding a new variable**

```typescript
// src/config/env.ts
const envSchema = S.Struct({
  // ... existing vars
  NEW_FEATURE_ENABLED: S.optionalWith(S.String, { default: () => "false" }),
});
```

#### Changing Security-Related Variables

Variables requiring security review:
- `JWT_SECRET`
- `DATABASE_URL`
- `CORS_ORIGIN`
- Rate limiting settings

**Process:**
1. Create change request (Significant)
2. Security review required
3. Test in staging first
4. Schedule production change
5. Monitor for issues

---

## Emergency Change Process

### Criteria for Emergency Change

- Active security incident
- Production outage
- Critical data integrity issue
- Compliance violation

### Emergency Change Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Identify emergency and notify stakeholders           │
│                                                         │
│ 2. Obtain verbal approval from:                         │
│    - Engineering Lead, OR                               │
│    - On-call manager                                    │
│                                                         │
│ 3. Implement fix                                        │
│    - Create branch: hotfix/INCIDENT-XXX                 │
│    - Make minimal changes required                      │
│    - Test locally if possible                           │
│                                                         │
│ 4. Deploy to production                                 │
│    - Direct merge to main (bypass normal review)        │
│    - Monitor deployment                                 │
│                                                         │
│ 5. Verify fix                                           │
│    - Confirm issue resolved                             │
│    - Check for regressions                              │
│                                                         │
│ 6. Post-emergency documentation                         │
│    - Create change request (retroactive)                │
│    - Document in incident report                        │
│    - Schedule proper review of fix                      │
└─────────────────────────────────────────────────────────┘
```

### Emergency Change Log

```markdown
# Emergency Change Log

## Change ID: EMG-XXXX
## Incident ID: INC-XXXX
## Date/Time: YYYY-MM-DD HH:MM

### Summary
[Brief description of emergency fix]

### Approval
- Approved by: [Name]
- Approval method: [ ] Verbal [ ] Email [ ] Slack
- Time of approval: [HH:MM]

### Changes Made
[List of files/systems modified]

### Deployment
- Deployed by: [Name]
- Deployment time: [HH:MM]
- Verification: [ ] Successful [ ] Failed

### Follow-up Required
- [ ] Proper PR created
- [ ] Code review completed
- [ ] Tests added
- [ ] Documentation updated
- [ ] Post-incident review scheduled
```

---

## Rollback Procedures

### Application Rollback

```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Revert to previous version
git revert <bad_commit_hash>

# 3. Push revert
git push origin main

# 4. Redeploy
# (deployment-specific commands)

# Alternative: Deploy previous release tag
git checkout tags/v1.x.x
# Deploy this version
```

### Database Rollback

**Caution:** Database rollbacks may cause data loss

```bash
# 1. Stop application
pkill -f "bun run"

# 2. Restore from backup
cp backups/pre-migration-YYYYMMDD.db data/foia-stream.db

# 3. Restart application
bun run start

# 4. Verify functionality
curl http://localhost:3000/api/v1/health
```

### Configuration Rollback

```bash
# 1. Restore previous environment configuration
cp .env.backup .env

# 2. Restart application
pkill -f "bun run"
bun run start

# 3. Verify configuration
curl http://localhost:3000/api/v1/health
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code review approved
- [ ] Change request approved
- [ ] Staging deployment successful
- [ ] Rollback plan documented
- [ ] Deployment window communicated
- [ ] On-call engineer aware

### Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
bun install

# 3. Run database migrations (if any)
bun run db:push

# 4. Build application (if applicable)
bun run build

# 5. Restart application
# (process manager dependent)
pm2 restart foia-stream
# OR
systemctl restart foia-stream
# OR
docker-compose up -d --build

# 6. Verify health
curl http://localhost:3000/api/v1/health
```

### Post-Deployment

- [ ] Health check successful
- [ ] Key functionality verified
- [ ] No errors in logs
- [ ] Performance nominal
- [ ] Change request closed
- [ ] Stakeholders notified

---

## Change Advisory Board (CAB)

### CAB Composition

| Role | Responsibility |
|------|----------------|
| Engineering Lead | Technical review, approval |
| Security Lead | Security impact assessment |
| Operations | Deployment, stability |
| Product Owner | Business impact, priority |

### CAB Meeting Schedule

- **Weekly:** Thursday 2:00 PM (regular changes)
- **Ad-hoc:** As needed (significant/urgent changes)

### CAB Agenda

1. Review pending change requests
2. Assess risk and impact
3. Approve, reject, or request more information
4. Schedule deployment windows
5. Review completed changes (lessons learned)

---

## Audit Trail

### Change Tracking

All changes are tracked via:
- Git commit history
- Pull request records
- Change request tickets
- Deployment logs

### Required Documentation

| Change Type | Documentation |
|-------------|---------------|
| Standard | Git commit, PR |
| Normal | Change request, Git, PR |
| Significant | Change request, Git, PR, CAB minutes |
| Emergency | Emergency log, post-incident report |
| Database | Migration log, backup records |

---

## Metrics and Reporting

### Change Metrics (Monthly)

| Metric | Target |
|--------|--------|
| Change success rate | > 95% |
| Mean time to deploy | < 4 hours |
| Emergency changes | < 5% of total |
| Rollbacks required | < 2% |
| Changes with incidents | < 1% |

### Change Report Template

```markdown
# Monthly Change Report: [MONTH YEAR]

## Summary
- Total changes: XX
- Successful: XX (XX%)
- Failed: XX (XX%)
- Emergency: XX (XX%)

## By Category
- Standard: XX
- Normal: XX
- Significant: XX

## By Risk Level
- Low: XX
- Medium: XX
- High: XX
- Critical: XX

## Notable Changes
1. [Change description]
2. [Change description]

## Issues Encountered
1. [Issue and resolution]

## Recommendations
- [Improvement suggestions]
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | Engineering | Initial version |
