---
epic: 2
story: 2.1
status: done
---

# Story 2.1: Sign-up / log-in pages in apps/web

## Dev Agent Record

**Implementation:**
- `apps/web/components/auth-form.tsx` — themed shadcn form (Card/Input/Label/Button), toggles between log-in and sign-up modes, calls `/api/auth/login` / `/api/auth/signup`.
- `apps/web/app/api/auth/signup/route.ts` — new (previously only `login` existed as pre-Epic-3 test infrastructure); wraps `RadarEngine.signUp`, surfaces `AuthError` messages (short password, duplicate email) as inline errors, issues a session cookie on success same as login.
- `apps/web/app/api/auth/logout/route.ts` — new; clears the session cookie.
- `apps/web/app/login/page.tsx` — replaced the Story 1.2 placeholder with `AuthForm`; redirects to `/opportunities` if already logged in.
- `apps/web/components/app-nav.tsx` — added a working Log out button (was static text before).

**Verified (real runtime, full round trip):**
```
GET /login -> renders "Log in" / "Sign up" toggle
POST /api/auth/signup {email, password, displayName} -> 201, session cookie issued
GET /api/auth/me -> real account, matches signup
GET /opportunities -> 200 (auth gate passes with the new session)
POST /api/auth/logout -> clears cookie
GET /api/auth/me (same cookie jar, updated) -> 401 "not authenticated"
```
(First logout check gave a false negative because the test's `curl` invocation didn't capture the updated `Set-Cookie` from the logout response into the same cookie jar — a test-harness mistake, not an app bug; re-ran with `-b file -c file` on the logout call and confirmed logout genuinely clears the session.)
