# NearNotice — Hyperlocal Community Noticeboard

NearNotice is a modern, privacy-focused, hyperlocal community noticeboard web application built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Supabase Auth + PostgreSQL**.

---

## ⚡ Quick Start (Under 10 Minutes)

### 1. Prerequisites
- **Node.js**: `v20+` or `v22+`
- **npm**: `v10+`

### 2. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "renew nearnotice"
npm install
```

### 3. Configure Environment Variables
Copy the template and provide your Supabase project credentials:
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CAPTCHA_SITE_KEY=
```

### 4. Apply Database Migrations
1. Open your Supabase Dashboard > **SQL Editor**.
2. Run the migration script in:
   `supabase/migrations/20261014000001_auth_notices.sql`
3. Configure your Supabase Dashboard settings following [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

### 5. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:5173`.

---

## 🧪 Quality Gates & Verification

Run all verification gates locally before submitting pull requests or deploying:

```bash
# 1. Strict TypeScript type check
npm run typecheck

# 2. Run unit and component test suites (Vitest + Testing Library)
npm test

# 3. Verify clean production dependencies
npm audit --omit=dev

# 4. Compile optimized production build
npm run build
```

---

## 📂 Project Structure

```
├── Onboarding Illustrations/   # Real onboarding artwork (1st, 2nd, 3rd screen.png)
├── docs/                       # Complete operational and architecture documentation
│   ├── ARCHITECTURE.md         # System design, data flow, component hierarchy
│   ├── AUTH_FLOWS.md           # Sequence diagrams for each auth and navigation flow
│   ├── HANDOVER.md             # Merger & acquisition transfer checklist
│   ├── RUNBOOK.md              # Operations, deployments, rollbacks, and incident handling
│   ├── SECURITY.md             # Threat model, CSP, token storage, and key rotation
│   └── SUPABASE_SETUP.md       # Step-by-step dashboard configuration checklist
├── public/                     # Static assets, logo, icons, CSP headers (_headers)
├── src/
│   ├── components/             # Reusable UI tokens, Layout, BottomNav, NoticeCard
│   ├── contexts/               # Deadlock-safe AuthContext with session states
│   ├── features/               # Auth service, safeReturnPath, cooldown, password policy
│   ├── pages/                  # Home feed, Onboarding, Login, Signup, Verify, Reset
│   ├── types/                  # Generated database and application types
│   └── lib/                    # Supabase PKCE client & security helpers
├── supabase/
│   ├── migrations/             # Idempotent SQL migration (profiles, notices, RLS)
│   └── tests/                  # pgTAP security and RLS test suite
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Security & Privacy Highlights

- **Anti-Enumeration**: Signup and forgot-password flows never reveal whether an email address is registered.
- **Safe Return Path**: `sanitizeReturnPath` prevents Open Redirect attacks by rejecting hostile schemes, `//` prefixes, and auth redirect loops.
- **Strict Content Security Policy (CSP)**: Zero inline scripts, restricted origins, and banned `dangerouslySetInnerHTML`.
- **Row Level Security (RLS)**: Enforced directly inside PostgreSQL for all public and owner-restricted operations.
- **Approximate Geolocation**: Public notice cards display approximate area labels instead of exact GPS coordinates.

---

## 📖 Documentation Index

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Authentication Flow Sequences](docs/AUTH_FLOWS.md)
- [Supabase Dashboard Setup](docs/SUPABASE_SETUP.md)
- [Security Threat Model & Controls](docs/SECURITY.md)
- [Operational Runbook](docs/RUNBOOK.md)
- [Handover & Sale Checklist](docs/HANDOVER.md)
- [Third-Party Licenses](THIRD_PARTY_LICENSES.md)