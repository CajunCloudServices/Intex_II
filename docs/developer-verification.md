# Developer Verification

Run these checks before pushing a meaningful app change.

## Backend

```bash
dotnet test backend/Intex.Api.Tests/Intex.Api.Tests.csproj
```

## Frontend Build

```bash
cd frontend && npm run build
```

## Frontend Smoke

Start the app first, then run:

```bash
cd frontend && SMOKE_BASE_URL=http://127.0.0.1:4195 npm run smoke
```

## Manual Spot Checks

- public home page loads
- login works for admin and donor
- donor does not see staff/admin navigation
- one admin mutation works
- audit history still loads
- privacy page and cookie banner still behave correctly

## Deployment Checks

For production:

```bash
curl -I https://slavicsoftwaresleuths.cajuncloudservices.com/
curl -I https://slavicsoftwaresleuths.cajuncloudservices.com/api/health
```

Confirm:

- HTTPS success
- HSTS header present
- CSP header present
- no `localhost` origins in the production CSP
