# Tanglaw Project

Production-minded INTEX architecture for a nonprofit operations platform covering donors, resident/case management, outreach analytics, and security/privacy controls.

This repo is meant to be understandable for a student team. The code is intentionally kept straightforward, the folder structure is simple, and the supporting docs point to the files that implement each major requirement.

## Quick Start For New Teammates

If you are trying to understand the project quickly, read in this order:

1. this README
2. [docs/architecture-overview.md](/Users/lajicpajam/School/Intex II/docs/architecture-overview.md)
3. [docs/backend-walkthrough.md](/Users/lajicpajam/School/Intex II/docs/backend-walkthrough.md)
4. [docs/frontend-walkthrough.md](/Users/lajicpajam/School/Intex II/docs/frontend-walkthrough.md)
5. [docs/testing-checklist.md](/Users/lajicpajam/School/Intex II/docs/testing-checklist.md)
6. [docs/local-development.md](/Users/lajicpajam/School/Intex II/docs/local-development.md)
7. [docs/auth-session-model.md](/Users/lajicpajam/School/Intex II/docs/auth-session-model.md)
8. [docs/deployment-runbook.md](/Users/lajicpajam/School/Intex II/docs/deployment-runbook.md)
9. [docs/assets-and-branding.md](/Users/lajicpajam/School/Intex II/docs/assets-and-branding.md)

## Tech Stack

- Backend: `.NET 10`, `ASP.NET Core Web API`, `EF Core`, `ASP.NET Identity`, cookie sessions
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
│   ├── notebooks/
│   ├── dashboards/
│   ├── scripts/
│   ├── json/
│   ├── images/
│   ├── models/
│   ├── data_loader.py
│   └── lighthouse_csv_v7/
├── docker-compose.yml
└── README.md
```

## What Is Implemented

- Clean frontend/backend separation
- PostgreSQL-backed EF Core data model
- ASP.NET Identity with seeded `Admin`, `Staff`, and `Donor` users
- ASP.NET Identity authentication with secure cookie sessions
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
- REST endpoints for auth, supporters, donations, residents, process recordings, home visitations, dashboard analytics, and public impact
- Additional endpoints for safehouses and incident reports
- Delete endpoints that require explicit confirmation via `confirm=true`
- React Router app shell with public pages and protected portal pages
- Donor-only contribution history page
- Functional cookie consent banner tied to an optional browser-accessible theme preference
- Tailored privacy policy page
- Admin-only audit history for sensitive mutations
- Google sign-in readiness for existing accounts, backed by ASP.NET Core external authentication
- Dockerfiles and compose stack for Postgres, backend, and frontend
- Backend test project with integration and validation tests
- Frontend Playwright smoke script for public navigation, donor RBAC, and admin CRUD smoke coverage

## Security Starter Scope

Implemented:

- HTTPS redirection outside local development, with local HTTP kept enabled so React/Vite cross-origin dev still works
- secure cookie-session auth
- ASP.NET Identity username/password authentication
- role-gated API access
- stronger-than-default password and account lockout settings
- basic security headers
- least-privilege production CSP response header with development-only localhost allowances
- HSTS in non-development environments
- audit logging for sensitive admin create, update, and delete actions
- functional cookie consent tied to a browser-accessible theme preference
- environment-based secret/config wiring

Scaffolded but not fully production-hardened:

- refresh tokens / revocation
- advanced cookie/session strategy
- MFA / third-party auth
- formal secret-management integration

The code and comments are explicit about these boundaries. This repo does not claim advanced hardening that is not implemented.

## Requirement Evidence

These are the three infrastructure/auth items that are already satisfied in the current codebase and deployment shape.

### 1. Credentials stored securely outside the codebase

- real environment values are expected from `.env` or exported environment variables
- the root `.env` file is git-ignored in [`.gitignore`](/Users/lajicpajam/School/Intex II/.gitignore)
- production compose reads secrets from environment variables in [docker-compose.production.yml](/Users/lajicpajam/School/Intex II/docker-compose.production.yml)
- the repo only contains a sample file, [`.env.example`](/Users/lajicpajam/School/Intex II/.env.example), for local setup

The production values that stay outside source control include:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTHENTICATION__GOOGLE__CLIENTID` if Google sign-in is enabled
- `AUTHENTICATION__GOOGLE__CLIENTSECRET` if Google sign-in is enabled
- `CORS_ALLOWED_ORIGIN_1`

### 2. Authenticated login with username/password using ASP.NET Identity

- Identity user model: [backend/Intex.Api/ApplicationUser.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/ApplicationUser.cs)
- Identity database context: [backend/Intex.Api/Data/ApplicationDbContext.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/ApplicationDbContext.cs)
- Identity + password policy wiring: [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Program.cs)
- login/register/me endpoints: [backend/Intex.Api/Controllers/AuthController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/AuthController.cs)

This project uses ASP.NET Identity for username/password authentication and establishes secure cookie sessions for the browser after a successful sign-in.

The password rules and account lockout settings in [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Program.cs) are intentionally stronger than the minimum defaults so the security requirement is visible in code.

### 3. Backend API and database deployed to a public cloud host

- production deployment workflow: [.github/workflows/deploy.yml](/Users/lajicpajam/School/Intex II/.github/workflows/deploy.yml)
- production containers: [docker-compose.production.yml](/Users/lajicpajam/School/Intex II/docker-compose.production.yml)

Current public backend base URL:

- [https://slavicsoftwaresleuths.cajuncloudservices.com/api/health](https://slavicsoftwaresleuths.cajuncloudservices.com/api/health)

Important deployment note:

- the API is publicly reachable over HTTPS
- the PostgreSQL database is deployed on the cloud host as part of the production stack, but it is intentionally not exposed publicly on the internet

That private-database/public-API split is the correct security posture for a production deployment.

## Environment Variables

Copy from [`.env.example`](/Users/lajicpajam/School/Intex II/.env.example) or export manually.

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CONNECTIONSTRINGS__DEFAULTCONNECTION`
- `AUTHENTICATION__GOOGLE__CLIENTID` (optional)
- `AUTHENTICATION__GOOGLE__CLIENTSECRET` (optional)
- `CORS__ALLOWEDORIGINS__0`
- `PUBLIC_API_HOSTNAME`
- `FRONTEND__BASEURL`
- `AUTHENTICATION__GOOGLE__CLIENTID` (optional)
- `AUTHENTICATION__GOOGLE__CLIENTSECRET` (optional)
- `VITE_API_URL`

See [docs/production-environment.md](/Users/lajicpajam/School/Intex II/docs/production-environment.md) for the full local-vs-production split and how to explain secret handling to a grader.

## Run Locally

The canonical teammate setup guide lives in [docs/local-development.md](/Users/lajicpajam/School/Intex II/docs/local-development.md).

### Option 1: Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- OpenAPI JSON in development: [http://localhost:8080/openapi/v1.json](http://localhost:8080/openapi/v1.json)

The compose file mounts [`ml-pipelines/lighthouse_csv_v7`](ml-pipelines/lighthouse_csv_v7) into the API container for full startup CSV seed. If KPIs stay at demo-sized counts, see [docs/dashboard-data-troubleshooting.md](docs/dashboard-data-troubleshooting.md).

### Option 2: Run Services Directly

If `5432` or `5080` is already in use on your machine, use an alternate local port such as `55433` for Postgres and `5081` for the backend.

Postgres:

```bash
docker run --name intex-postgres -e POSTGRES_DB=intex -e POSTGRES_USER=intex -e POSTGRES_PASSWORD="<your-strong-local-password>" -p 55433:5432 -d postgres:17
```

Backend:

```bash
cd backend/Intex.Api
ConnectionStrings__DefaultConnection="Host=localhost;Port=55433;Database=intex;Username=intex;Password=<your-strong-local-password>" dotnet run --urls http://localhost:5081
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
- `GET /api/audit-log`
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

- Architecture overview: [docs/architecture-overview.md](/Users/lajicpajam/School/Intex II/docs/architecture-overview.md)
- Backend walkthrough: [docs/backend-walkthrough.md](/Users/lajicpajam/School/Intex II/docs/backend-walkthrough.md)
- Frontend walkthrough: [docs/frontend-walkthrough.md](/Users/lajicpajam/School/Intex II/docs/frontend-walkthrough.md)
- Criteria map: [docs/criteria-map.md](/Users/lajicpajam/School/Intex II/docs/criteria-map.md)
- Manual test checklist: [docs/testing-checklist.md](/Users/lajicpajam/School/Intex II/docs/testing-checklist.md)
- Production environment guide: [docs/production-environment.md](/Users/lajicpajam/School/Intex II/docs/production-environment.md)
- Security verification checks: [docs/security-verification.md](/Users/lajicpajam/School/Intex II/docs/security-verification.md)
- Video demo checklist: [docs/video-demo-checklist.md](/Users/lajicpajam/School/Intex II/docs/video-demo-checklist.md)
- Team notes: [docs/notes.md](/Users/lajicpajam/School/Intex II/docs/notes.md)

## Google Sign-In Setup

The app is now wired for Google sign-in through the backend. Google sign-in is only enabled when these backend environment variables are set:

- `AUTHENTICATION__GOOGLE__CLIENTID`
- `AUTHENTICATION__GOOGLE__CLIENTSECRET`
- `FRONTEND__BASEURL`

Important behavior:

- Google sign-in is for existing Tanglaw Project accounts only.
- If a Google email matches an existing local account, the Google login is linked to that account.
- If no existing local account matches, sign-in is rejected instead of silently creating a new user.

Google Cloud Console values:

- Authorized JavaScript origins:
  - your frontend origin, for example `https://slavicsoftwaresleuths.cajuncloudservices.com`
  - local Vite origins you actually use, for example `http://localhost:5173`
- Authorized redirect URI:
  - `https://slavicsoftwaresleuths.cajuncloudservices.com/signin-google`
  - local backend callback if needed, for example `http://localhost:5081/signin-google`

## Next Recommended Steps

- Split restricted resident notes into tighter access rules if needed
- Add richer reporting and charting
- Add broader end-to-end smoke coverage for the remaining CRUD pages
