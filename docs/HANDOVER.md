# NearNotice — Project Handover & Acquisition Checklist

This checklist is provided for audits, handovers, mergers, or acquisition transfers of NearNotice.

---

## 1. Source Repository & Version Control
- [ ] Transfer GitHub/GitLab repository ownership or invite new owner with Admin permissions.
- [ ] Rotate all GitHub Personal Access Tokens, Deploy Keys, and Webhook secrets.
- [ ] Transfer branch protection rules (`main` requires CI pass before merge).
- [ ] Audit commit history for any accidentally committed credentials (`gitleaks`).

---

## 2. Supabase Organization & Database
- [ ] Go to **Supabase Dashboard** > **Organization Settings** > **Members**.
- [ ] Invite new owner as **Owner** and transfer primary billing.
- [ ] Once accepted, demote or remove previous owner credentials.
- [ ] Rotate Database password and verify active connection strings.
- [ ] Confirm daily database backups or Point-In-Time Recovery (PITR) are enabled.

---

## 3. Domain & DNS Records
- [ ] Transfer domain registrar ownership (Namecheap, GoDaddy, Cloudflare Registrar).
- [ ] Update administrative contact email and whois information.
- [ ] Verify DNS records (A/CNAME for frontend, MX/TXT for email delivery SPF/DKIM/DMARC).

---

## 4. SMTP / Transactional Email Provider
- [ ] Transfer account ownership for transactional mail (Resend, SendGrid, Amazon SES).
- [ ] Rotate API keys used by Supabase SMTP.
- [ ] Check reputation score and bounce/complaint rates.

---

## 5. Web Hosting & Static CDN
- [ ] Transfer hosting project (Vercel, Cloudflare Pages, Netlify, or AWS).
- [ ] Review environment variables in the project settings.
- [ ] Confirm custom domain SSL certificates auto-renew properly.

---

## 6. CAPTCHA & Bot Protection
- [ ] Transfer Cloudflare Turnstile or hCaptcha site key to new owner.
- [ ] Update `VITE_CAPTCHA_SITE_KEY` in deployment environment settings.

---

## 7. Error Tracking & Monitoring
- [ ] Transfer Sentry, LogRocket, or Datadog organization ownership.
- [ ] Rotate ingestion DSNs and client tokens.
- [ ] Verify that sensitive user data (emails, passwords, auth codes) remains scrubbed in logs.

---

## 8. Final Credential Rotation Confirmation
- [ ] `VITE_SUPABASE_ANON_KEY` rotated
- [ ] Supabase JWT Secret rotated
- [ ] Database Postgres password changed
- [ ] Custom SMTP password rotated
- [ ] Handover sign-off completed by both parties
