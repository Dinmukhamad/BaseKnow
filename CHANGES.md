# Critical fixes — BaseKnow 2.0

Closes Critical findings C1–C3, C5–C8 from `baseknow-audit.md`.
C4 (markdown sanitization) also included since it touches the same file as C3.

## Files changed

### Backend

- `backend/Dockerfile` — removed `python -m app.seed` from container CMD. **(C6)**
- `backend/requirements.txt` — replaced `python-jose` with `PyJWT`; added `slowapi`. **(C7, C8)**
- `backend/app/main.py` — removed `*.vercel.app` regex from CORS; narrowed methods/headers; wired up the rate limiter. **(C1, C8)**
- `backend/app/core/config.py` — added `DB_POOL_MODE` setting. **(C5)**
- `backend/app/core/limiter.py` — **new** module; central slowapi `Limiter`, supports Redis via `LIMITER_STORAGE_URI`. **(C8)**
- `backend/app/core/security.py` — switched JWT encoding to `PyJWT`; pinned `algorithms=[…]` on decode (no `alg: none` confusion). **(C7)**
- `backend/app/db/session.py` — serverless-aware engine: `NullPool` by default, classic pool when `DB_POOL_MODE=server`. **(C5)**
- `backend/app/seed.py` — removed `print(password)`; existing admin no longer gets its password reset on each run; demo users only created when `ENVIRONMENT=dev`. **(C6)**
- `backend/app/services/auth.py` — `authenticate()`/`refresh()` now return `(TokenResponse, refresh_token_plain)` so the endpoint layer can put the refresh in a cookie instead of the body. **(C2)**
- `backend/app/schemas/auth.py` — `TokenResponse.refresh_token` and `RefreshRequest.refresh_token` are now optional. **(C2)**
- `backend/app/api/v1/endpoints/auth.py` — login/refresh now set the refresh token as `HttpOnly; Secure; SameSite=None` cookie scoped to `/api/v1/auth`; logout clears it; `@limiter.limit` applied to login (`5/min`) and refresh (`30/min`); refresh accepts the token from cookie *or* body (body kept as fallback during migration). **(C2, C8)**

### Frontend

- `frontend/package.json` — added `rehype-sanitize`. **(C4)**
- `frontend/src/api/client.ts` — `withCredentials: true`; the response interceptor refreshes without sending a body (cookie carries the token); only `access_token` written/cleared from localStorage. **(C2)**
- `frontend/src/store/auth.ts` — `login()`/`logout()` no longer touch `refresh_token` in localStorage. **(C2)**
- `frontend/src/types/index.ts` — `TokenResponse.refresh_token` optional. **(C2)**
- `frontend/src/components/SearchModal.tsx` — replaced `dangerouslySetInnerHTML` highlighter with a `<HighlightedText>` component that builds React nodes (React escapes `text` for free); removed unused `getHistory` import. **(C3)**
- `frontend/src/lib/safeUrl.ts` — **new** helper. Normalises user-supplied URLs; rejects `javascript:`/`data:` schemes. **(C4)**
- `frontend/src/pages/KBArticlePage.tsx` — `<MDMarkdown rehypePlugins={[[rehypeSanitize]]}>`; article `links` filtered through `safeUrl()` before `href`. **(C4)**

## Required env / config changes after deploy

1. **Set `CORS_ORIGINS` explicitly** in Vercel env to your frontend origin(s),
   e.g. `CORS_ORIGINS=https://baseknow-front.vercel.app`. The wildcard
   `*.vercel.app` regex is gone — any preview URL must be listed here.

2. **(Recommended)** Point `DATABASE_URL` at your pooled Postgres URL
   (Neon "Pooled" / Supabase pooler / Vercel `POSTGRES_PRISMA_URL`).
   The app uses `NullPool` in serverless mode, so cheap connection setup
   is on the DB side.

3. **(Optional)** For real rate limiting across Lambda instances set
   `LIMITER_STORAGE_URI=redis://default:<password>@<host>:6379/0`
   (Upstash works). Without it, the limiter only protects against
   brute force on a single warm instance.

4. **(Recommended)** Set `ENVIRONMENT=production` in Vercel env so seed
   never creates `supervisor`/`operator` demo accounts in prod, and so
   future env-gated features behave correctly.

## Migration notes for users

- All existing user sessions are invalidated by this deploy because the
  refresh-token transport changed (cookie vs body). Users will be
  redirected to login on the next API call. This is normal and expected.
- `refresh_token` values that were previously stored in browser
  localStorage are dead — the app no longer reads from there. You may
  optionally ship a tiny one-shot cleanup that calls
  `localStorage.removeItem('refresh_token')` to keep things tidy, but
  it's not required for correctness.

## What still remains (next rounds)

- **High**: GIN-index expression mismatch (H1), bulk-op N+1 (H2),
  inline styles cleanup (H7), Zustand selectors (H5), etc.
- **Medium**: ESLint config, dead `src/index.css`, favicons,
  security headers in `vercel.json`.
- Access-token still lives in localStorage. Fully moving it to memory
  requires reworking the API client and surviving page reloads via a
  silent refresh on app mount. Doable, but bigger than this round.
