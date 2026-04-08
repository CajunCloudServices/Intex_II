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

The repo includes [`.env.example`](/Users/lajicpajam/School/Intex II/.env.example) only as a safe sample. The real `.env` file is ignored by git and should never be committed.

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
- override `AllowedHosts` from the default `*` to your real API hostnames in production configuration
- `CORS__ALLOWEDORIGINS__*` should only list the real frontend origin(s)
- `PUBLIC_API_HOSTNAME` should be the public HTTPS API base, for example `https://slavicsoftwaresleuths.cajuncloudservices.com`
- `VITE_API_URL` should be the frontend-facing `/api` base URL, for example `https://slavicsoftwaresleuths.cajuncloudservices.com/api`

## How to explain this to a grader

"Credentials stored securely outside the codebase" means:

- the repo contains no real production secrets
- the app reads production values from environment variables
- the deployment workflow injects those values at deploy time
- the sample file is only documentation, not a source of truth
