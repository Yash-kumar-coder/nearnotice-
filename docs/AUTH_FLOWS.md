# NearNotice — Authentication & Navigation Flow Sequences

This document illustrates the end-to-end execution sequences for all user flows in NearNotice.

---

## 1. Onboarding Flow

```
[First-Time Visitor] ---> Visits "/"
                              |
                     Is 'nearnotice:onboarding:v1' == 'done'?
                              |
                    +---------+---------+
                    |                   |
                   No                  Yes
                    |                   |
            Redirect to /onboarding     Render Public Home Feed
                    |
      +-------------+-------------+
      |                           |
  Swipe / Next              Click 'Skip' or 'Get Started'
      |                           |
  View 3 slides             Store 'nearnotice:onboarding:v1'='done'
                                  |
                            Navigate to "/" (replace)
```

---

## 2. Guest Browse & Protected Gate Flow

```
[Guest Visitor] ---> Browses Home Feed (Public Notices)
                          |
             Action: Click "Bookmark" or "Create Notice"
                          |
             Is User Authenticated?
                          |
                 +--------+--------+
                 |                 |
                Yes                No
                 |                 |
        Perform action directly    Show Auth Modal or Redirect to:
                                   /auth?next=/requested-page
                                           |
                               User logs in or signs up
                                           |
                               Sanitize return path via safeReturnPath
                                           |
                               Redirect to /requested-page
```

---

## 3. Signup & Email Verification Flow

```
[User] ---> Fills Signup Form (/signup)
                 |
        Client-side validation (min 6 chars, uppercase, lowercase, number, symbol policy, passwords match)
                 |
        Calls authService.signUp({ email, password, redirectTo: "/auth/callback?next=..." })
                 |
        Supabase creates unconfirmed user (empty identities if existing)
                 |
        Session returned? (Misconfiguration check)
                 |
         +-------+-------+
         |               |
        Yes (Bug)       No (Normal)
         |               |
      Sign out,        Store email in sessionStorage
      show alert       Navigate to /verify-email (replace)
                               |
               +---------------+---------------+
               |                               |
        User waits (60s cooldown,        User opens link in email
        spam tip, delay tip)                   |
                                         /auth/callback?code=...
                                               |
                                     exchangeCodeForSession()
                                               |
                                     email_confirmed_at set
                                               |
                                     Trigger creates profile row
                                               |
                                     Auto-detected across all tabs!
                                               |
                                     Redirect to sanitized next
```

---

## 4. Login Flow

```
[User] ---> Fills Login Form (/login)
                 |
        Validate email & password
                 |
        Calls authService.signInWithPassword({ email, password })
                 |
        Error?
         +-------+-------+
         |               |
        Yes              No
         |               |
   Check error code:     Is user.email_confirmed_at set?
   - invalid_credentials        |
   - email_not_confirmed    +---+---+
   - 429 rate limit         |       |
   - client backoff (5x)   Yes      No
                            |       |
                            |    Sign out unverified session,
                            |    show "Verify Email" button
                            |
                   Redirect to sanitized next or "/"
```

---

## 5. Password Reset Flow

```
[User] ---> Requests Reset (/forgot-password)
                 |
        Calls authService.resetPasswordForEmail({ email, redirectTo: "/auth/callback?flow=recovery" })
                 |
        Generic confirmation displayed (Anti-enumeration: email existence hidden)
        60-second cooldown initiated
                 |
        User receives email with recovery link
                 |
        User clicks link -> /auth/callback?code=...&flow=recovery
                 |
        exchangeCodeForSession(code) establishes recovery session
                 |
        Navigates to /reset-password
                 |
        User enters new password matching policy
                 |
        authService.updatePassword(newPassword)
                 |
        authService.signOut('global') (Revokes all existing sessions)
                 |
        Success screen displayed -> Link to /login
```

---

## 6. Callback Handling & Edge Cases

| Scenario | Handled By | Outcome |
| :--- | :--- | :--- |
| **Strict Mode Double-Run** | `executionRef.current` guard | Code exchanged exactly once |
| **Sensitive URL Tokens** | `history.replaceState` | URL query and tokens immediately stripped |
| **Link Opened in Other Browser** | PKCE verifier detection | Friendly prompt: "Your email is confirmed — log in to continue" |
| **Expired / Reused Link** | `otp_expired` error mapping | Generic recovery screen offering new link request |
| **Callback Refreshed** | Session re-check | If session already established, proceeds to destination |
