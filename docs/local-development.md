# Local Development

This is the quickest way to get the repo running when you are actively building features.

## Recommended Direct-Run Mode

Use this mode when you want the fastest frontend/backend iteration loop.

Backend:

```bash
cd "/Users/lajicpajam/School/Intex II/backend/Intex.Api"
ASPNETCORE_ENVIRONMENT=Development Database__Provider=InMemory dotnet run --no-launch-profile --urls http://127.0.0.1:5099
```

Frontend:

```bash
cd "/Users/lajicpajam/School/Intex II/frontend"
VITE_API_URL=http://127.0.0.1:5099/api npm run dev -- --host 127.0.0.1 --port 4195
```

Open:

- frontend: `http://127.0.0.1:4195`
- backend health: `http://127.0.0.1:5099/api/health`

## When To Use Docker Compose

Use `docker compose up --build` when you need:

- Postgres instead of the in-memory development database
- the full local stack closer to deployment shape
- a teammate-friendly setup with fewer manual environment variables

## Common Port Conflict Fix

If a port is already in use, pick a new backend/frontend pair. Example:

Backend:

```bash
dotnet run --no-launch-profile --urls http://127.0.0.1:5102
```

Frontend:

```bash
VITE_API_URL=http://127.0.0.1:5102/api npm run dev -- --host 127.0.0.1 --port 4198
```

To see what is using a port:

```bash
lsof -i :5102
```

## Seeded Local Accounts

- `admin@intex.local` / `Admin!234567`
- `staff@intex.local` / `Staff!234567`
- `donor@intex.local` / `Donor!234567`

## Local Google Sign-In Readiness

The Google button only appears when the backend is configured with Google credentials.

Example:

```bash
cd "/Users/lajicpajam/School/Intex II/backend/Intex.Api"
ASPNETCORE_ENVIRONMENT=Development \
Database__Provider=InMemory \
FRONTEND__BASEURL=http://127.0.0.1:4195 \
AUTHENTICATION__GOOGLE__CLIENTID="your_google_client_id" \
AUTHENTICATION__GOOGLE__CLIENTSECRET="your_google_client_secret" \
dotnet run --no-launch-profile --urls http://127.0.0.1:5099
```

Verify with:

```bash
curl http://127.0.0.1:5099/api/auth/providers
```

If `googleEnabled` is `true`, the login page will show the Google button.
