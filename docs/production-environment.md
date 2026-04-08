# Production Environment Guide

This project keeps real credentials and deployment secrets outside the codebase.

## What stays out of git

These values belong in a server-side `.env` file, a GitHub Actions secret, or another secret manager:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CONNECTIONSTRINGS__DEFAULTCONNECTION`
- `JWT__*` (legacy; the app uses **cookie sessions**, not JWT — remove any old JWT env vars from deployment templates)
- `CORS__ALLOWEDORIGINS__0`
- `CORS__ALLOWEDORIGINS__1` if a second frontend origin is needed
- `PUBLIC_API_HOSTNAME`
- `FRONTEND__BASEURL`
- `AUTHENTICATION__GOOGLE__CLIENTID` if Google sign-in is enabled
- `AUTHENTICATION__GOOGLE__CLIENTSECRET` if Google sign-in is enabled
- `VITE_API_URL` (production: full `/api` base, e.g. `https://your-host/api`)
- `ForwardedHeaders__KnownProxyIPs__*` / `ForwardedHeaders__KnownNetworks__*` when the API is behind a reverse proxy
- `AllowedHosts__0`, `AllowedHosts__1`, … **or** a single `AllowedHosts` value with hosts separated by `;` (see [Host filtering](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/host-filtering))

The repo includes [`.env.example`](/Users/lajicpajam/School/Intex II/.env.example) only as a safe sample. The real `.env` file is ignored by git and should never be committed.

### AllowedHosts (API hostname filtering)

Base [appsettings.json](../backend/Intex.Api/appsettings.json) uses `AllowedHosts: "*"` for local flexibility. For real deployments, **do not** leave `*` in production: set explicit API hostnames so Kestrel’s host middleware can reject requests with unexpected `Host` headers.

- [appsettings.Production.json](../backend/Intex.Api/appsettings.Production.json) ships a **placeholder** hostname (`api.example.com`). Replace it via environment variables or your secret/config store—do not commit customer hostnames if the repo is public.
- Override in Azure App Service, Docker, or shell: `AllowedHosts__0=api.yourdomain.com` (additional indices for more hosts), or one string `AllowedHosts=api.example.com;www.example.com` per Microsoft’s host-filtering docs.

### Forwarded headers (reverse proxy trust)

When the API sits behind Azure Front Door, Application Gateway, App Service ARR, nginx, or another reverse proxy, configure **trusted** proxy identity so `X-Forwarded-For` and `X-Forwarded-Proto` reflect the client and HTTPS correctly:

- Set **`ForwardedHeaders__KnownNetworks__*`** to CIDR ranges that contain **only** your proxy’s egress addresses (e.g. the subnet your nginx container uses to reach the API, or the documented ranges for your Azure tier—**replace** any example with values from your network or official docs).
- Optionally set **`ForwardedHeaders__KnownProxyIPs__*`** if your proxy presents a stable single IP.
- The API sets **`ForwardLimit = 1`** on forwarded headers so only one trusted hop is honored by default; validate `Request.Scheme` and client IP in staging after deploy.

Examples are **not** copied into committed secrets: use placeholders in docs and real CIDRs only in deployment configuration.

### CORS and cookies checklist (production)

- **`Cors:AllowedOrigins`** (e.g. `CORS__ALLOWEDORIGINS__0`) must **exactly** match the browser origin your SPA uses: same scheme, host, and port (no trailing path).
- **`VITE_API_URL`** must be the API base the browser will send **credentialed** requests to (e.g. same-site `/api` proxy vs full `https://api-host/api`), consistent with cookie domain and `SameSite` behavior.
- If the SPA and API share the same site (registrable domain + compatible paths), **`SameSite=Lax`** may be enough for some flows; if the SPA is on a **different** site than the API, the app uses **`SameSite=None`** with **`Secure`** and precise CORS—verify end-to-end in the browser after deploy.
- In **Production**, the API **fails startup** if `Cors:AllowedOrigins` is missing/empty or includes loopback origins—set real frontend origins in environment configuration (see [appsettings.Production.json](../backend/Intex.Api/appsettings.Production.json) placeholders).

## Local development defaults

Local development can safely use:

- `ASPNETCORE_ENVIRONMENT=Development`
- localhost database credentials
- localhost API and frontend URLs
- cookie-based auth (no JWT secrets required for the browser)

For local Vite, prefer same-origin `/api` (see `frontend/vite.config.ts` proxy) so `HttpOnly` cookies work; set `VITE_API_URL=/api` or rely on the dev default.

## Production expectations

Production is stricter by design:

- `ASPNETCORE_ENVIRONMENT` should be `Production`
- session cookies are `HttpOnly` and `Secure`; cross-origin SPAs must list exact frontend origins under `Cors:AllowedOrigins` and use credentials as configured
- override `AllowedHosts` from the default `*` to your real API hostnames (see **AllowedHosts** above)
- `CORS__ALLOWEDORIGINS__*` should only list the real frontend origin(s); Production startup validates this (see **CORS and cookies checklist**)
- `PUBLIC_API_HOSTNAME` should be the public HTTPS API base, for example `https://slavicsoftwaresleuths.cajuncloudservices.com`
- `VITE_API_URL` should be the frontend-facing `/api` base URL, for example `https://slavicsoftwaresleuths.cajuncloudservices.com/api`

## How to explain this to a grader

"Credentials stored securely outside the codebase" means:

- the repo contains no real production secrets
- the app reads production values from environment variables
- the deployment workflow injects those values at deploy time
- the sample file is only documentation, not a source of truth
