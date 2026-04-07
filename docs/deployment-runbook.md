# Deployment Runbook

This document describes the current production deployment shape used by HarborLight Nexus.

## Current Shape

- frontend: static Vite build
- backend: ASP.NET Core API in Docker
- database: PostgreSQL in Docker on the server, kept private
- public API host: `https://slavicsoftwaresleuths.cajuncloudservices.com`

## Server Expectations

- Docker and Docker Compose installed
- a server-side `.env` file with production secrets
- reverse proxy / TLS already configured in front of the app
- database not publicly exposed to the internet

## Required Production Secrets

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CONNECTIONSTRINGS__DEFAULTCONNECTION`
- `JWT__KEY`
- `JWT__ISSUER`
- `JWT__AUDIENCE`
- `CORS__ALLOWEDORIGINS__0`
- `FRONTEND__BASEURL`
- `PUBLIC_API_HOSTNAME`
- optional Google auth:
  - `AUTHENTICATION__GOOGLE__CLIENTID`
  - `AUTHENTICATION__GOOGLE__CLIENTSECRET`

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
2. confirm `.env` still exists and still contains the needed secrets
3. rebuild with `docker compose ... up -d --build`
4. re-run the health checks
5. spot-check login and one admin mutation flow

## Rollback

If a deploy breaks:

1. return the repo to the previous known-good commit
2. rebuild the production compose stack
3. re-run health checks

The repo should always keep the last stable mainline state easy to redeploy.
