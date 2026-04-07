# Backend Walkthrough

This document explains how the backend is organized so a student team can find the right code quickly.

## Start Here

Read these files in order:

1. [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Program.cs)
2. [backend/Intex.Api/Data/ApplicationDbContext.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/ApplicationDbContext.cs)
3. [backend/Intex.Api/Data/Seed/AppSeeder.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/Seed/AppSeeder.cs)
4. [backend/Intex.Api/Controllers/AuthController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/AuthController.cs)
5. the controller for the feature you want to change

## Request Flow

Most backend requests follow the same path:

1. ASP.NET Core starts in [Program.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Program.cs).
2. The request passes through forwarded-header handling, error handling, security headers, CORS, authentication, and authorization.
3. A controller action runs.
4. The controller reads or writes data through [ApplicationDbContext.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/ApplicationDbContext.cs).
5. The action returns a typed DTO instead of returning EF entities directly.

## Auth Flow

The project uses ASP.NET Identity for credential checking and JWT for frontend API calls.

Main files:

- user model: [ApplicationUser.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/ApplicationUser.cs)
- auth endpoints: [AuthController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/AuthController.cs)
- token creation: [JwtTokenService.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Services/JwtTokenService.cs)
- policies and role names:
  - [Policies.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Authorization/Policies.cs)
  - [RoleNames.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Authorization/RoleNames.cs)

The login sequence is:

1. `POST /api/auth/login` checks email/password with Identity.
2. If valid, `JwtTokenService` builds a JWT with role claims and the optional `supporter_id` claim for donor history.
3. The frontend stores that token and sends it back on later API calls.
4. Role-based policies decide which controllers/actions may be used.

## Database Model

The backend keeps the schema simple and close to the page structure.

Core groups:

- fundraising:
  - `Supporter`
  - `Donation`
  - `DonationAllocation`
- case management:
  - `Resident`
  - `InterventionPlan`
  - `ProcessRecording`
  - `HomeVisitation`
  - `CaseConference`
  - `IncidentReport`
- public/outreach:
  - `SocialMediaPost`
  - `PublicImpactSnapshot`
- facility:
  - `Safehouse`

Relationship rules worth remembering:

- supporters have many donations
- donations have many allocations
- residents belong to one safehouse
- residents have many process recordings, visitations, conferences, intervention plans, and incidents
- safehouses are intentionally protected from broad cascade deletes

Those delete choices are configured in [ApplicationDbContext.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/ApplicationDbContext.cs).

## Seed Data

[AppSeeder.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/Seed/AppSeeder.cs) exists so the app is usable immediately after startup.

It seeds:

- roles
- local demo users
- safehouses
- supporters and donations
- residents and intervention plans
- case documentation data such as recordings, visitations, conferences, and incidents
- public impact snapshots and outreach rows

Important:

- the seeder is intended to be idempotent
- it is useful for local development and demos
- it should not be treated as the final production data-import strategy

## Controller Pattern

Most controllers follow the same structure:

1. authorize at the controller or action level
2. build an EF query
3. project to response DTOs
4. use request DTOs for create/update
5. require `confirm=true` for destructive deletes

Good examples to copy:

- [SupportersController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/SupportersController.cs)
- [ResidentsController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/ResidentsController.cs)
- [CaseConferencesController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/CaseConferencesController.cs)
- [ReportsController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/ReportsController.cs)

## Where To Edit Common Changes

- change login or token behavior:
  - [AuthController.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Controllers/AuthController.cs)
  - [JwtTokenService.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Services/JwtTokenService.cs)
- change database relationships or precision:
  - [ApplicationDbContext.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/ApplicationDbContext.cs)
- change seeded demo records:
  - [AppSeeder.cs](/Users/lajicpajam/School/Intex II/backend/Intex.Api/Data/Seed/AppSeeder.cs)
- add a new feature endpoint:
  - create DTOs in `backend/Intex.Api/DTOs/`
  - add controller in `backend/Intex.Api/Controllers/`
  - if persistent, add/update entity and migration

## Testing Strategy

Backend tests live in [backend/Intex.Api.Tests](/Users/lajicpajam/School/Intex II/backend/Intex.Api.Tests).

Current test focus:

- integration coverage for major routes and role behavior
- validation coverage for request DTOs

Run:

```bash
dotnet test backend/Intex.Api.Tests/Intex.Api.Tests.csproj
```
