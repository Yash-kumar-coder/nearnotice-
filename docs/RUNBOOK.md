# NearNotice — Operations & Incident Runbook

---

## 1. Deployment Runbook

### Prerequisites
- Node.js `v22+` installed
- Clean working directory with no untracked secrets
- Environment variables configured on target host:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_CAPTCHA_SITE_KEY` (optional)

### Build & Deployment Procedure
```bash
# 1. Install pinned dependencies
npm ci

# 2. Execute verification gates
npm run typecheck
npm test
npm audit --omit=dev

# 3. Production build
npm run build
```
Deploy the generated `dist/` directory to your web host (Vercel, Cloudflare Pages, Netlify, AWS S3+CloudFront).

---

## 2. Instant Rollback Procedure

If a production release introduces regression:
1. **On Vercel / Netlify / Cloudflare**:
   - Go to **Deployments**.
   - Select the previous stable deployment and click **Rollback / Promote to Production**.
2. **Database Rollback**:
   - Schema changes in `supabase/migrations/20261014000001_auth_notices.sql` are backwards compatible.
   - If an emergency table restore is necessary, use Supabase Point-in-Time Recovery (PITR).

---

## 3. SMTP & Email Delivery Incidents

### Symptoms
- Users reporting verification emails not arriving.
- Supabase error log displays: `535 Authentication failed` or `421 Service not available`.

### Diagnostic Steps
1. In Supabase Dashboard, inspect **Logs** > **Auth Logs**.
2. Check email provider status (Resend, SendGrid, Amazon SES status pages).
3. Verify DNS records:
   - Ensure **SPF** includes your SMTP provider: `v=spf1 include:... ~all`.
   - Ensure **DKIM** keys are active and verified.
   - Check **DMARC** policy (`p=none` or `p=quarantine`).
4. If provider is throttling, temporarily increase rate limit thresholds or switch to secondary provider credentials.

---

## 4. Rate-Limit Incidents (HTTP 429)

### Symptoms
- Users see: *"Too many requests. Please wait a few moments before trying again."*

### Resolution
1. Verify if the traffic is legitimate or an active credential stuffing attack.
2. In Supabase Dashboard > **Authentication** > **Rate Limits**:
   - If traffic is legitimate (e.g. viral neighborhood event), temporarily raise rate limits.
   - If an attack is detected, keep limits strict and enable Cloudflare Turnstile CAPTCHA via `VITE_CAPTCHA_SITE_KEY`.
