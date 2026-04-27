# Security Incident Response Plan

## Overview

This document outlines the procedures for responding to security incidents affecting the Wasel platform.

---

## Incident Classification

### Severity Levels

**P0 - Critical**
- Active data breach
- Complete service outage
- Payment system compromise
- Authentication bypass
- Mass user data exposure

**P1 - High**
- Partial service degradation
- Suspected unauthorized access
- Vulnerability with active exploit
- Data integrity issues
- DDoS attack

**P2 - Medium**
- Security vulnerability (no active exploit)
- Suspicious activity patterns
- Configuration issues
- Non-critical data exposure
- Failed security controls

**P3 - Low**
- Security policy violations
- Minor configuration issues
- Informational security findings
- Compliance gaps

---

## Response Team

### Roles & Responsibilities

**Incident Commander (IC)**
- Overall incident coordination
- Decision-making authority
- Stakeholder communication
- Post-incident review

**Technical Lead**
- Technical investigation
- Remediation implementation
- System recovery
- Evidence preservation

**Communications Lead**
- Internal communications
- Customer notifications
- Public relations
- Status updates

**Legal/Compliance**
- Regulatory notifications
- Legal implications
- Compliance requirements
- Evidence handling

---

## Response Procedures

### Phase 1: Detection & Triage (0-15 minutes)

**1. Incident Detection**
```bash
# Common detection sources:
- Sentry error alerts
- Supabase security alerts
- User reports
- Monitoring alerts
- Security scans
- Third-party notifications
```

**2. Initial Assessment**
- Confirm incident is real (not false positive)
- Classify severity (P0-P3)
- Identify affected systems
- Estimate user impact
- Document initial findings

**3. Notification**
```
P0/P1: Immediate notification
- On-call engineer (phone)
- Incident Commander (phone)
- CTO/CEO (phone)

P2/P3: Standard notification
- Email to security team
- Slack #security-incidents
- Create incident ticket
```

### Phase 2: Containment (15-60 minutes)

**Immediate Actions (P0/P1)**

**1. Stop the Bleeding**
```bash
# If active breach detected:

# Rotate compromised credentials
supabase secrets set STRIPE_SECRET_KEY=new_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=new_key

# Disable compromised accounts
psql -c "UPDATE users SET status='suspended' WHERE id='compromised_user_id';"

# Block malicious IPs (Cloudflare/Vercel)
# Add to firewall rules

# Take affected service offline if necessary
vercel env rm VITE_FEATURE_FLAG_COMPROMISED_FEATURE production
vercel --prod
```

**2. Preserve Evidence**
```bash
# Capture logs
supabase logs --type=api --start="2024-01-01 00:00" > incident_logs.txt
vercel logs --since=1h > vercel_incident_logs.txt

# Database snapshot
pg_dump -h db.project.supabase.co -U postgres > incident_db_snapshot.sql

# Screenshot suspicious activity
# Document timeline of events
```

**3. Assess Scope**
```sql
-- Check for unauthorized access
SELECT * FROM auth.audit_log_entries 
WHERE created_at > '2024-01-01 00:00:00'
AND action IN ('user.login', 'user.signup')
ORDER BY created_at DESC;

-- Check for data modifications
SELECT * FROM audit_logs 
WHERE created_at > '2024-01-01 00:00:00'
AND action IN ('UPDATE', 'DELETE')
ORDER BY created_at DESC;

-- Check for suspicious transactions
SELECT * FROM wallet_transactions 
WHERE created_at > '2024-01-01 00:00:00'
AND amount > 1000
ORDER BY created_at DESC;
```

### Phase 3: Eradication (1-4 hours)

**1. Remove Threat**
```bash
# Patch vulnerability
git checkout -b hotfix/security-patch
# Apply fix
git commit -m "Security patch: [CVE-XXXX]"
git push origin hotfix/security-patch

# Deploy immediately
vercel --prod

# Verify fix
npm run test:security
```

**2. Strengthen Defenses**
```typescript
// Add rate limiting
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
};

// Add additional validation
export function validateInput(input: string): boolean {
  // Strict input validation
  const sanitized = input.trim();
  if (sanitized.length > 1000) return false;
  if (/<script|javascript:|onerror=/i.test(sanitized)) return false;
  return true;
}

// Enable additional logging
logger.setLevel('debug');
logger.enableSecurityAudit(true);
```

**3. Update Security Controls**
```bash
# Update dependencies
npm audit fix --force
npm update

# Review and update security headers
# Update vercel.json with stricter CSP

# Enable additional Supabase security features
# - Enable RLS on all tables
# - Review and tighten policies
# - Enable audit logging
```

### Phase 4: Recovery (4-24 hours)

**1. Restore Normal Operations**
```bash
# Verify all systems operational
curl https://wasel.jo/health
curl https://api.wasel.jo/health

# Run smoke tests
npm run test:e2e

# Monitor error rates
# Check Sentry dashboard
# Check Vercel analytics
```

**2. Validate Security**
```bash
# Run security scan
npm audit
npm run test:security

# Verify no backdoors
git log --all --oneline --since="1 week ago"
git diff HEAD~10

# Check for suspicious code
grep -r "eval(" src/
grep -r "dangerouslySetInnerHTML" src/
```

**3. User Communication**
```markdown
# If user data affected:

Subject: Important Security Update

Dear Wasel User,

We recently identified and resolved a security issue that may have 
affected your account. Here's what happened and what we've done:

**What Happened:**
[Brief description of incident]

**What We've Done:**
- Immediately patched the vulnerability
- Rotated all security credentials
- Enhanced monitoring and security controls
- Conducted thorough security audit

**What You Should Do:**
- Change your password immediately
- Review recent account activity
- Enable two-factor authentication
- Contact support if you notice anything suspicious

We take security seriously and apologize for any concern this may cause.

Best regards,
Wasel Security Team
support@wasel.jo
```

### Phase 5: Post-Incident (24-72 hours)

**1. Post-Mortem Meeting**
```markdown
# Agenda:
1. Timeline of events
2. Root cause analysis
3. What went well
4. What could be improved
5. Action items
6. Lessons learned

# Attendees:
- Incident Commander
- Technical Lead
- Engineering team
- Product team
- Leadership
```

**2. Post-Mortem Document**
```markdown
# Incident Post-Mortem: [Incident ID]

## Summary
[Brief description of incident]

## Timeline
- 00:00 - Incident detected
- 00:15 - Team notified
- 00:30 - Containment measures applied
- 02:00 - Vulnerability patched
- 04:00 - Normal operations restored
- 24:00 - Post-mortem completed

## Root Cause
[Detailed root cause analysis]

## Impact
- Users affected: X
- Duration: X hours
- Data exposed: [Yes/No - details]
- Financial impact: $X

## What Went Well
- Quick detection
- Effective containment
- Good team coordination

## What Could Be Improved
- Earlier detection
- Faster response time
- Better monitoring

## Action Items
1. [Action] - Owner: [Name] - Due: [Date]
2. [Action] - Owner: [Name] - Due: [Date]
3. [Action] - Owner: [Name] - Due: [Date]

## Lessons Learned
[Key takeaways]
```

**3. Implement Improvements**
```bash
# Based on post-mortem action items:

# Example: Add better monitoring
# Create new Sentry alert rules
# Add custom metrics to Vercel

# Example: Improve security testing
# Add security-specific E2E tests
# Implement automated security scans in CI

# Example: Update documentation
# Update security policies
# Improve runbooks
# Train team on new procedures
```

---

## Regulatory Notifications

### GDPR (If Applicable)

**Data Breach Notification Requirements:**
- **Timeline:** Within 72 hours of becoming aware
- **Authority:** Local data protection authority
- **Content:** Nature of breach, affected data, mitigation measures

**User Notification:**
- Required if high risk to user rights and freedoms
- Must be clear and plain language
- Include recommended actions

### Payment Card Industry (PCI DSS)

**Breach Notification:**
- Notify payment processor immediately
- Notify card brands (Visa, Mastercard, etc.)
- Follow PCI Forensic Investigator (PFI) process

### Local Regulations (Jordan)

**Telecommunications Regulatory Commission (TRC):**
- Notify within 24 hours of significant incidents
- Provide incident details and impact assessment
- Submit remediation plan

---

## Communication Templates

### Internal Notification (Slack)

```
🚨 SECURITY INCIDENT - P0

Incident ID: INC-2024-001
Severity: P0 - Critical
Status: Investigating

Summary: [Brief description]

Affected Systems:
- [System 1]
- [System 2]

Incident Commander: @name
Technical Lead: @name

War Room: #incident-2024-001
Status Updates: Every 30 minutes

DO NOT discuss publicly until cleared by IC.
```

### Customer Notification (Email)

```
Subject: Security Update - Action Required

Dear Wasel User,

We are writing to inform you of a security incident that may have 
affected your account.

WHAT HAPPENED:
[Clear, non-technical explanation]

WHAT WE'VE DONE:
- Immediately secured the vulnerability
- Enhanced security measures
- Notified relevant authorities

WHAT YOU SHOULD DO:
1. Change your password immediately
2. Review your recent account activity
3. Enable two-factor authentication
4. Contact us if you notice anything unusual

We sincerely apologize for this incident and any inconvenience caused.
Your security is our top priority.

For questions: support@wasel.jo
Security concerns: security@wasel.jo

Wasel Security Team
```

### Public Statement (Social Media)

```
We recently identified and resolved a security issue affecting our 
platform. All affected users have been notified directly. 

We've taken immediate action to secure our systems and prevent 
future incidents. User security is our top priority.

For more information: https://wasel.jo/security-update
```

---

## Prevention Measures

### Proactive Security

**1. Regular Security Audits**
```bash
# Weekly automated scans
npm audit
npm run test:security

# Monthly manual reviews
- Code review for security issues
- Dependency updates
- Configuration review
- Access control audit
```

**2. Security Training**
- Quarterly security awareness training
- Phishing simulation exercises
- Secure coding practices
- Incident response drills

**3. Monitoring & Alerting**
```typescript
// Enhanced monitoring rules
const securityAlerts = {
  failedLogins: {
    threshold: 5,
    window: '5m',
    action: 'alert',
  },
  suspiciousActivity: {
    threshold: 10,
    window: '1m',
    action: 'block',
  },
  dataExfiltration: {
    threshold: 1000,
    window: '1m',
    action: 'alert',
  },
};
```

**4. Access Control**
```bash
# Principle of least privilege
# Regular access reviews
# MFA for all admin accounts
# Separate production access
```

---

## Tools & Resources

### Security Tools

**Monitoring:**
- Sentry: https://sentry.io
- Vercel Analytics: https://vercel.com/analytics
- Supabase Logs: https://supabase.com/dashboard

**Scanning:**
- npm audit
- Snyk: https://snyk.io
- OWASP ZAP: https://www.zaproxy.org

**Incident Management:**
- PagerDuty: https://pagerduty.com
- Opsgenie: https://www.atlassian.com/software/opsgenie

### Reference Documentation

- OWASP Incident Response: https://owasp.org/www-community/Incident_Response
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- SANS Incident Handler's Handbook: https://www.sans.org/reading-room/

---

## Contact Information

**Security Team:**
- Email: security@wasel.jo
- Emergency: +962-XX-XXX-XXXX
- PGP Key: [Key ID]

**External Resources:**
- Supabase Support: support@supabase.io
- Vercel Support: support@vercel.com
- Stripe Security: security@stripe.com

**Authorities:**
- Jordan TRC: https://trc.gov.jo
- CERT: cert@trc.gov.jo

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-01  
**Next Review:** 2024-04-01  
**Owner:** Security Team
