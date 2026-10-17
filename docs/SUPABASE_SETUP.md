# NearNotice — Supabase Dashboard Setup Checklist

This document details every manual configuration step required in the Supabase Dashboard before launching NearNotice. The frontend cannot automate these settings; project owners and administrators must complete them directly.

---

## 1. Project Creation & API Keys
1. Create a new Supabase project (use separate projects for **dev**, **staging**, and **production**).
2. Go to **Project Settings** > **API**.
3. Copy the **Project URL** and the **anon (public)** key.
4. Set these in your `.env` or deployment environment:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```
   > ⚠️ **CRITICAL SECURITY NOTE**: Never paste your `service_role` (secret) key into `.env` or frontend repositories.

---

## 2. Authentication Configuration
### Email Provider
Go to **Authentication** > **Providers** > **Email**:

- [ ] **Enable Email Provider**: `ON`
- [ ] **Confirm email**: `ON` *(Crucial: Ensures email ownership before password login)*
- [ ] **Secure email change**: `ON`
- [ ] **Secure password change**: `ON`
- [ ] **Anonymous sign-ins**: `OFF`

### Google OAuth Provider (Recommended for 1-Click Login & Auto-Verification)
Google OAuth automatically validates email ownership and eliminates mail spam/delay issues.
Go to **Authentication** > **Providers** > **Google**:

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, add your Supabase project callback URL:
   `https://<your-project-id>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase Dashboard (**Authentication** > **Providers** > **Google**):
   - [ ] **Enable Google provider**: `ON`
   - [ ] Paste **Client ID**
   - [ ] Paste **Client Secret**
   - [ ] Save changes.

---

## 3. URL Configuration & Redirect Allow-List
Go to **Authentication** > **URL Configuration**:

- [ ] **Site URL**:
  - Production: `https://yourdomain.com`
  - Staging: `https://staging.yourdomain.com`
  - Local development: `http://localhost:5173`
- [ ] **Redirect URLs (Allow-List)**:
  Use exact redirect URLs only. **Never use wildcards in production!**
  - `http://localhost:5173/auth/callback`
  - `https://staging.yourdomain.com/auth/callback`
  - `https://yourdomain.com/auth/callback`

---

## 4. Password Policy
Go to **Authentication** > **Password Policy**:

- [ ] **Minimum password length**: Set to `6` characters (recommended 6–8 minimum).
- [ ] **Require lowercase**: `ON`
- [ ] **Require uppercase**: `ON`
- [ ] **Require numbers**: `ON`
- [ ] **Require symbols**: `ON`
- [ ] **Pwned / Leaked Passwords check**: Enable if available on your Supabase plan tier.

---

## 5. Session & JWT Lifespan
Go to **Authentication** > **Sessions**:

- [ ] **Refresh Token Rotation**: `ON`
- [ ] **Detect refresh token reuse**: `ON` (Revokes child tokens if reused)
- [ ] **JWT expiry limit**: 3600 seconds (1 hour) or less.
- [ ] **Refresh token reuse interval**: 10 seconds.

---

## 6. Rate Limiting
Go to **Authentication** > **Rate Limits**:

- [ ] **Email sends per hour**: Adjust based on anticipated user volume (default is 30/hour on free tier; set appropriate limits with custom SMTP).
- [ ] **Sign-in attempts**: Keep strict rate-limiting enabled against brute-force attacks.
- [ ] **Password recovery requests**: Limit to avoid email flooding.

---

## 7. Custom SMTP Configuration
Go to **Project Settings** > **Authentication** > **SMTP Settings**:

> ⚠️ The default Supabase SMTP server is strictly rate-limited and intended only for initial evaluation. Production instances MUST use a dedicated SMTP service (e.g. Resend, SendGrid, Amazon SES, Postmark).

- [ ] Configure custom SMTP host, port (587 / 465), user, and password.
- [ ] Ensure sending domain has valid **SPF**, **DKIM**, and **DMARC** DNS records.

---

## 8. Email Templates
Go to **Authentication** > **Email Templates**:

- [ ] **Confirm signup**:
  Ensure the action URL points to `{{ .ConfirmationURL }}`.
  Include notice: *"If you did not request this account, please ignore this email."*
- [ ] **Reset password**:
  Ensure the action URL points to `{{ .ConfirmationURL }}`.
  Include notice: *"This password reset link will expire in 1 hour. If you did not request this, please disregard."*

---

## 9. Run Database Migrations
1. Open the **SQL Editor** in your Supabase Dashboard.
2. Run Migration 1:
   - Open [20261014000001_auth_notices.sql](file:///c:/Users/Admin/Desktop/renew%20nearnotice/supabase/migrations/20261014000001_auth_notices.sql)
   - Paste and execute it in the SQL Editor.
3. Run Migration 2 (Enables CRUD, Delete, Edit, Views counter, Price, and Multi-images):
   - Open [20261014000002_add_notice_details.sql](file:///c:/Users/Admin/Desktop/renew%20nearnotice/supabase/migrations/20261014000002_add_notice_details.sql)
   - Paste and execute it in the SQL Editor.
4. Verify in **Table Editor**:
   - `public.profiles` table exists with RLS enabled.
   - `public.notices` table exists with `price`, `contact_number`, `images`, and `views_count` columns.
   - `public.public_notices` view exists with `owner_id` included.
   - `notice-images` storage bucket exists with public read and owner-only write policies.

---

## 10. Security & Performance Advisors
Go to **Database** > **Advisors**:

- [ ] Run the **Security Advisor** and ensure:
  - All public tables have Row Level Security (RLS) enabled.
  - No policies use insecure `using (true)` write rules.
  - Security Definer triggers use `set search_path = ''`.
- [ ] Run the **Performance Advisor** to verify that index recommendations are satisfied.
