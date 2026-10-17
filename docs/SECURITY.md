# NearNotice — Security Architecture & Threat Model

This document outlines the security controls, threat models, incident response playbooks, and residual risks for NearNotice.

---

## 1. Threat Model & Mitigations

| Threat | Risk Level | Implemented Mitigation |
| :--- | :--- | :--- |
| **Open Redirect Vulnerability** | High | `sanitizeReturnPath()` strictly enforces same-origin parsing, rejects `//`, backslashes, arbitrary schemes (`javascript:`, `data:`), recursion up to 3 decode passes, and auth loops. |
| **Cross-Site Scripting (XSS)** | High | Production CSP blocks inline scripts (`script-src 'self'`), prohibits `eval`, forbids external CDNs, and bans `dangerouslySetInnerHTML`. React automatic HTML escaping is enforced. |
| **Token Hijacking via localStorage** | Medium | Strict CSP prevents script injection. Server-validated `getUser()` checks are required for sensitive operations instead of trusting local session caches. |
| **Account Enumeration** | Medium | Signup and password reset flows return generic success screens whether an email exists or not. Unconfirmed users generate no application profile rows. |
| **PostgREST Filter Injection** | Medium | All search input parameters escape `%`, `_`, and commas prior to composing `.or()` queries. Max query length capped at 100 characters. |
| **Brute Force & Credential Stuffing** | Medium | Client-side backoff after 5 consecutive failures, backed by Supabase Auth rate limits on password and OTP endpoints. Turnstile/hCaptcha support ready via `VITE_CAPTCHA_SITE_KEY`. |
| **Privilege Escalation in PostgreSQL** | High | Row Level Security (RLS) is enabled on all tables. Triggers use `SECURITY DEFINER set search_path = ''` to prevent search_path manipulation. Notice `owner_id` is immutable. |

---

## 2. Key Rotation Playbook

### Anon / Public Key Rotation
If `VITE_SUPABASE_ANON_KEY` is compromised or needs periodic rotation:
1. Generate a new API key pair in Supabase Dashboard (**Project Settings** > **API**).
2. Update the environment variable in your production host (Vercel, Cloudflare, Netlify).
3. Trigger a production deployment.
4. Retire the old key in Supabase.

### JWT Secret Rotation
If the project JWT secret is exposed:
1. In Supabase Dashboard (**Project Settings** > **API** > **JWT Settings**), click **Generate a new secret**.
2. This immediately invalidates all active sessions across all users.
3. Users will be asked to re-authenticate cleanly.

---

## 3. Incident Response & Security Contact

If a security vulnerability is identified in NearNotice:

1. **Responsible Disclosure Contact**:
   - Security Contact: `security@nearnotice.local` (or configured project owner email)
   - Expected initial response: within 48 hours.
2. **Containment Protocol**:
   - Assess severity (CVSS score).
   - If database tampering is suspected, temporarily set `alter table notices disable row level security;` or revoke API access while investigating.
   - Deploy emergency fix to main branch with regression tests.
