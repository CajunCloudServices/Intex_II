# HarborLight Nexus Starter

Production-minded INTEX starter architecture for a nonprofit operations platform covering donors, resident/case management, outreach analytics, and security/privacy foundations.

This repo is meant to be understandable for a student team. The code is intentionally kept straightforward, the folder structure is simple, and the supporting docs point to the files that implement each major requirement.

## Tech Stack

- Backend: `.NET 10`, `ASP.NET Core Web API`, `EF Core`, `ASP.NET Identity`, `JWT`
- Frontend: `React 19`, `TypeScript`, `Vite`, `React Router`
- Database: `PostgreSQL`
- Dev environment: `Docker Compose`

## Folder Structure

```text
.
├── backend/
│   └── Intex.Api/
├── docs/
├── frontend/
├── ml-pipelines/
├── docker-compose.yml
└── README.md
```

## What Is Implemented

- Clean frontend/backend separation
- PostgreSQL-backed EF Core data model
- ASP.NET Identity with seeded `Admin`, `Staff`, and `Donor` users
- JWT authentication for React integration
- Role-based authorization policies
- Representative nonprofit domain entities:
  - `Safehouse`
  - `Supporter`
  - `Donation`
  - `DonationAllocation`
  - `Resident`
  - `ProcessRecording`
  - `HomeVisitation`
  - `InterventionPlan`
  - `IncidentReport`
  - `SocialMediaPost`
  - `PublicImpactSnapshot`
- Starter REST endpoints for auth, supporters, donations, residents, process recordings, home visitations, dashboard analytics, and public impact
- Additional starter endpoints for safehouses and incident reports
- Delete endpoints that require explicit confirmation via `confirm=true`
- React Router app shell with public pages and protected portal pages
- Donor-only contribution history page
- Cookie consent starter banner
- Privacy policy starter page
- Dockerfiles and compose stack for Postgres, backend, and frontend
- Backend test project with integration and validation tests
- Frontend Playwright smoke script for public navigation, donor RBAC, and admin CRUD smoke coverage

## Security Starter Scope

Implemented:

- HTTPS redirection outside local development, with local HTTP kept enabled so React/Vite cross-origin dev still works
- JWT auth
- role-gated API access
- stronger-than-default password policy starter
- basic security headers
- starter CSP response header
- environment-based secret/config wiring

Scaffolded but not fully production-hardened:

- Final CSP tightening
- HSTS validation in real hosted deployment
- audit logging
- refresh tokens / revocation
- advanced cookie/session strategy
- MFA / third-party auth
- formal secret-management integration

The code and comments are explicit about these boundaries. This repo does not claim advanced hardening that is not implemented.

## Seeded Test Accounts

These are for local development only:

- `admin@intex.local` / `Admin!234567`
- `staff@intex.local` / `Staff!234567`
- `donor@intex.local` / `Donor!234567`

## Environment Variables

Copy from [`.env.example`](/Users/lajicpajam/School/Intex II/.env.example) or export manually.

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CONNECTIONSTRINGS__DEFAULTCONNECTION`
- `JWT__KEY` (use at least a 32-byte secret for HS256)
- `VITE_API_URL`

## Run Locally

### Option 1: Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- OpenAPI JSON in development: [http://localhost:8080/openapi/v1.json](http://localhost:8080/openapi/v1.json)

### Option 2: Run Services Directly

If `5432` or `5080` is already in use on your machine, use an alternate local port such as `55433` for Postgres and `5081` for the backend.

Postgres:

```bash
docker run --name intex-postgres -e POSTGRES_DB=intex -e POSTGRES_USER=intex -e POSTGRES_PASSWORD=intex_dev_password -p 55433:5432 -d postgres:17
```

Backend:

```bash
cd backend/Intex.Api
ConnectionStrings__DefaultConnection="Host=localhost;Port=55433;Database=intex;Username=intex;Password=intex_dev_password" dotnet run --urls http://localhost:5081
```

Frontend:

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:5081/api npm run dev
```

## Useful Starter Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/public-impact`
- `GET /api/dashboard/summary`
- `GET /api/supporters`
- `GET /api/donations`
- `GET /api/donations/my-history`
- `GET /api/residents`
- `GET /api/process-recordings`
- `GET /api/home-visitations`
- `GET /api/safehouses`
- `GET /api/incidents`

Admin-only create/update/delete patterns exist on the main CRUD controllers.

## Testing

Backend tests:

```bash
dotnet test backend/Intex.Api.Tests/Intex.Api.Tests.csproj
```

Frontend production build:

```bash
cd frontend
npm run build
```

Frontend smoke test after the app is running locally:

```bash
cd frontend
SMOKE_BASE_URL=http://localhost:5173 npm run smoke
```

Helpful docs:

- Criteria map: [docs/criteria-map.md](/Users/lajicpajam/School/Intex II/docs/criteria-map.md)
- Manual test checklist: [docs/testing-checklist.md](/Users/lajicpajam/School/Intex II/docs/testing-checklist.md)

## Next Recommended Steps

- Add audit history for case and donation changes
- Split restricted resident notes into tighter access rules if needed
- Add richer reporting and charting
- Decide on final deployment target and tighten CSP/HSTS for that environment
- Add broader end-to-end smoke coverage for the remaining CRUD pages
