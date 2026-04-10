# Deployment Runbook

This document describes the current production deployment shape used by Tanglaw Project.

## Current Shape

- frontend: static Vite build
- backend: ASP.NET Core API in Docker
- database: PostgreSQL in Docker on the server, kept private
- public API host: `https://slavicsoftwaresleuths.cajuncloudservices.com`

## Server Expectations

- Docker and Docker Compose installed
- a server-side `.env` file at `/home/lajicpajam/deployments/harborlight-nexus/.env` with production secrets
- reverse proxy / TLS already configured in front of the app
- database not publicly exposed to the internet

## Required Production Secrets

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CONNECTIONSTRINGS__DEFAULTCONNECTION`
- `CORS__ALLOWEDORIGINS__0`
- `FRONTEND__BASEURL`
- `PUBLIC_API_HOSTNAME`
- optional Google auth:
  - `AUTHENTICATION__GOOGLE__CLIENTID`
  - `AUTHENTICATION__GOOGLE__CLIENTSECRET`
- host filtering: `AllowedHosts__0` (and further indices) or semicolon-separated `AllowedHosts` — see [production-environment.md](production-environment.md#allowedhosts-api-hostname-filtering)
- behind a reverse proxy: `ForwardedHeaders__KnownProxyIPs__*` / `ForwardedHeaders__KnownNetworks__*` — see [production-environment.md](production-environment.md#forwarded-headers-reverse-proxy-trust)

The deploy script rejects placeholder values such as `<PUT_DB_NAME_HERE>`. Keep example values out of the live server `.env`.

## Deploy Backend

From the server app directory:

```bash
docker compose --env-file .env -f docker-compose.production.yml up -d --build
```

## Health Checks

Verify:

```bash
curl -I https://slavicsoftwaresleuths.cajuncloudservices.com/
curl -I https://slavicsoftwaresleuths.cajuncloudservices.com/api/health
```

You should see:

- HTTPS success
- `Strict-Transport-Security`
- `Content-Security-Policy`

## Update Flow

1. pull the new repo state on the server
2. confirm `/home/lajicpajam/deployments/harborlight-nexus/.env` still exists and still contains the needed secrets
3. rebuild with `docker compose ... up -d --build`
4. re-run the health checks
5. spot-check login and one admin mutation flow
6. verify authenticated `GET /api/safehouses`, `GET /api/residents`, and `GET /api/reports/trend-deployments` all return `200`

## Automation Notes

The intended deploy path is the `Deploy Tanglaw Project` GitHub Actions workflow on pushes to `main`.

If GitHub Actions runner assignment is temporarily unavailable, the production host also runs `harborlight-auto-deploy.timer` once per minute. It fetches `origin/main`, compares it to `/home/lajicpajam/deployments/harborlight-nexus/.deploy-rev`, and only runs the deploy when the SHA changed.

## Rollback

If a deploy breaks:

1. return the repo to the previous known-good commit
2. rebuild the production compose stack
3. re-run health checks

The repo should always keep the last stable mainline state easy to redeploy.
