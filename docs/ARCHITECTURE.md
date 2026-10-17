# NearNotice — System Architecture

NearNotice is a production-grade, hyperlocal community noticeboard application designed for scalability, accessibility, and high data security.

---

## 1. Technical Stack

- **Client Runtime**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) with custom `@theme` tokens
- **Routing**: React Router 7 with route-level lazy loading and code splitting
- **Backend & Authentication**: Supabase (PostgreSQL 15+, Supabase Auth with PKCE flow)
- **Security & Authorization**: Row Level Security (RLS) policies and Security Definer triggers
- **Quality Gates**: Vitest, React Testing Library, TypeScript strict mode, pgTAP

---

## 2. Component Hierarchy & Routing

```
App (ErrorBoundary, AuthProvider, Router)
 │
 ├── Public Feed (/)
 │    ├── Layout (Container, BottomNav)
 │    └── Home (Search, Categories, NoticeCard stream, GuestAuthModal)
 │
 ├── Onboarding Carousel (/onboarding)
 │    └── Pointer gesture track, 3 real illustrations, keyboard navigation
 │
 ├── Auth Public-Only Routes (PublicOnlyRoute guard)
 │    ├── /auth (AuthChoice welcome)
 │    ├── /login (Login form, backoff handling, inline errors)
 │    ├── /signup (Signup form, min 6 char policy with upper/lower/number/symbol)
 │    └── /forgot-password (Anti-enumeration reset request)
 │
 ├── Auth Callback & Verification
 │    ├── /verify-email (60s cooldown, multi-tab auto-detection)
 │    ├── /auth/callback (PKCE code exchange, token stripping)
 │    └── /reset-password (Recovery session guarded)
 │
 └── Protected Routes (RequireAuth guard)
      ├── /profile (User credentials, global sign-out)
      ├── /saved (Bookmarked notices)
      ├── /notices/new (Publish notice form)
      └── /notices/manage (Notice owner dashboard with delete)
```

---

## 3. Security Boundary Architecture

```
[Browser / Client]
       │
  (Strict CSP: default-src 'self'; connect-src *.supabase.co)
  (Safe Return Path Sanitization: Blocks Open Redirects)
  (PKCE Flow: Ephemeral code verifier)
       │
[Supabase PostgREST & Auth Gateway]
       │
  (JWT verification & email_confirmed_at enforcement)
       │
[PostgreSQL Database]
       │
  ├── public.profiles (Owner-only read/update)
  ├── public.notices (RLS: published viewable by all, writes owner-only)
  ├── public.public_notices (View: hides owner IDs & exact GPS coordinates)
  └── Triggers (Security Definer with set search_path = '')
```

---

## 4. Keyset Pagination & Feed Performance

The public notices feed implements **keyset pagination** on `(created_at, id)`:
- Avoids expensive `OFFSET` queries as table size grows into hundreds of thousands of rows.
- In-flight requests are cancelled using `AbortController` when category or search filters change.
- IntersectionObserver triggers incremental loads with visible fallback buttons for accessibility.
- Zero client-side HTML injections (`dangerouslySetInnerHTML` is prohibited).
