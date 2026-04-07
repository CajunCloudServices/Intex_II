# Criteria Map

This file maps the big INTEX requirements to the main places in the codebase.

## Backend foundation

- API startup, auth, CORS, security headers, migrations:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Program.cs`
- ASP.NET Identity user model:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/ApplicationUser.cs`
- Entity and database model:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/ApplicationDbContext.cs`
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Entities/`
- Seed users and seed data:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/Seed/AppSeeder.cs`
- JWT creation:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Services/JwtTokenService.cs`
- Production cloud deployment:
  - `/Users/lajicpajam/School/Intex II/docker-compose.production.yml`
  - `/Users/lajicpajam/School/Intex II/.github/workflows/deploy.yml`
- Secret/env wiring:
  - `/Users/lajicpajam/School/Intex II/.env.example`
  - `/Users/lajicpajam/School/Intex II/.gitignore`

## Role-based auth

- Role names and policies:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Authorization/RoleNames.cs`
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Authorization/Policies.cs`
- Login, register, and `/auth/me`:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/AuthController.cs`

## Representative API endpoints

- Supporters:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/SupportersController.cs`
- Donations and donor history:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/DonationsController.cs`
- Residents:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/ResidentsController.cs`
- Process recordings:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/ProcessRecordingsController.cs`
- Home visitations:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/HomeVisitationsController.cs`
- Safehouses:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/SafehousesController.cs`
- Incident reports:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/IncidentReportsController.cs`
- Dashboard and analytics:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/DashboardController.cs`
- Public impact:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/PublicImpactController.cs`

## Frontend foundation

- App routes:
  - `/Users/lajicpajam/School/Intex II/frontend/src/App.tsx`
- Global layout and sidebar/top nav:
  - `/Users/lajicpajam/School/Intex II/frontend/src/components/layout/AppShell.tsx`
- Protected routes:
  - `/Users/lajicpajam/School/Intex II/frontend/src/components/ProtectedRoute.tsx`
- Auth state:
  - `/Users/lajicpajam/School/Intex II/frontend/src/contexts/AuthContext.tsx`
- API client:
  - `/Users/lajicpajam/School/Intex II/frontend/src/api/`
- Styling:
  - `/Users/lajicpajam/School/Intex II/frontend/src/styles/app.css`

## Public pages

- Home page:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/public/HomePage.tsx`
- Impact dashboard:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/public/ImpactDashboardPage.tsx`
- Login:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/public/LoginPage.tsx`
- Privacy:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/public/PrivacyPolicyPage.tsx`

## Portal pages

- Admin dashboard:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/AdminDashboardPage.tsx`
- Donors and contributions:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/DonorsContributionsPage.tsx`
- Caseload inventory:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/CaseloadInventoryPage.tsx`
- Process recordings:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/ProcessRecordingPage.tsx`
- Home visitations:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/HomeVisitationsPage.tsx`
- Reports and analytics:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/ReportsAnalyticsPage.tsx`
- Donor-only page:
  - `/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/DonorHistoryPage.tsx`

## Validation and tests

- DTO validation attributes:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api/DTOs/`
- Integration and validation tests:
  - `/Users/lajicpajam/School/Intex II/backend/Intex.Api.Tests/`
- Frontend smoke coverage:
  - `/Users/lajicpajam/School/Intex II/frontend/scripts/smoke.mjs`
