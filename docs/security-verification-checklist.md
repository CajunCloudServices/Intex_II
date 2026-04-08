# Post-hardening security verification

Run these checks after changes to auth, reports, or static assets.

## Dependency / supply chain

- Frontend: `npm audit --omit=dev` (from `frontend/`)
- Backend: `dotnet list package --vulnerable --include-transitive` (from `backend/Intex.Api/`)

## Auth & session

- [ ] No JWT or session secret in `localStorage` / `sessionStorage` (Application tab in browser devtools).
- [ ] After Google sign-in, URL has **no** `token` in query or hash; only `returnUrl` / `error` query params.
- [ ] Auth cookie: `HttpOnly`, `Secure` in production, appropriate `SameSite` for your hosting layout.
- [ ] `POST /api/auth/logout` clears the session (subsequent `GET /api/auth/me` returns 401).

## Access control

- [ ] Anonymous requests to `/api/reports/*`, `/api/ml-dashboard/*`, and portal-backed routes return 401/403 as appropriate.
- [ ] Donor vs Staff vs Admin boundaries unchanged (spot-check donor-only and admin-only endpoints).

## Data exposure

- [ ] `frontend/public/ml-dashboards/*.json` **not** present (or only non-sensitive placeholders); ML JSON served only via `GET /api/ml-dashboard/data/{key}` when authenticated as Staff/Admin.
- [ ] No sensitive report payloads exposed on public static paths.

## Transport & headers

- [ ] Production uses HTTPS; HSTS and security headers still present (`X-Content-Type-Options`, CSP, etc.).
- [ ] Behind a reverse proxy: `ForwardedHeaders:KnownProxyIPs` / `KnownNetworks` set in configuration; app not trusting open proxies.

## Rate limiting

- [ ] `/api/auth/login` is rate-limited in non-Test environments.
- [ ] Heavy report/ML routes use the `reports-heavy` policy.

## Smoke test

With API + Vite dev running (`frontend`: `npm run dev`, API: `dotnet run` on port 5080):

```bash
cd frontend
npm run smoke
```

Optional env overrides: `SMOKE_BASE_URL`, `SMOKE_DONOR_EMAIL`, `SMOKE_DONOR_PASSWORD`, `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`.
