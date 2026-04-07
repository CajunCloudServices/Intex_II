# Frontend Walkthrough

This document explains how the React app is put together and where to make common changes.

## Start Here

Read these files in order:

1. [frontend/src/App.tsx](/Users/lajicpajam/School/Intex II/frontend/src/App.tsx)
2. [frontend/src/components/layout/AppShell.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/layout/AppShell.tsx)
3. [frontend/src/contexts/AuthContext.tsx](/Users/lajicpajam/School/Intex II/frontend/src/contexts/AuthContext.tsx)
4. [frontend/src/api/client.ts](/Users/lajicpajam/School/Intex II/frontend/src/api/client.ts)
5. [frontend/src/api/index.ts](/Users/lajicpajam/School/Intex II/frontend/src/api/index.ts)
6. then the specific page you want to change

## Route Structure

[App.tsx](/Users/lajicpajam/School/Intex II/frontend/src/App.tsx) is the route map for the whole app.

The route tree is split into three main groups:

- public pages:
  - home
  - impact
  - donate
  - login
  - privacy
- staff/admin portal pages:
  - dashboard
  - donors
  - caseload
  - process recordings
  - home visitations
  - reports
- donor-only portal page:
  - donor history

The `PortalHomeRoute` helper sends donors and staff/admin users to different landing pages after login.

## Auth Flow

[AuthContext.tsx](/Users/lajicpajam/School/Intex II/frontend/src/contexts/AuthContext.tsx) is the center of frontend auth.

It is responsible for:

- storing the JWT in local storage
- restoring a session on refresh
- calling `/api/auth/me`
- exposing `user`, `token`, `login`, and `logout`
- reacting to `401` and `403` events raised by the shared API client

That means individual pages do not need to manage session expiration themselves.

## API Flow

The frontend talks to the backend in two layers:

1. [client.ts](/Users/lajicpajam/School/Intex II/frontend/src/api/client.ts)
   - low-level fetch wrapper
   - auth header insertion
   - common error parsing
   - global unauthorized/forbidden events
2. [index.ts](/Users/lajicpajam/School/Intex II/frontend/src/api/index.ts)
   - typed route helper functions like `api.login`, `api.residents`, `api.createDonation`, and so on

This pattern keeps page components cleaner. If the backend path changes, you usually edit the API layer rather than each page.

## Shared Layout

[AppShell.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/layout/AppShell.tsx) is the shared frame for both the public site and the portal.

It handles:

- top navigation
- mobile menu behavior
- sidebar for authenticated users
- role badges
- sign-out button
- footer
- outlet rendering

The shell stays mounted while route content changes, which makes navigation and role-aware layout feel consistent.

## Common Page Pattern

Most portal pages follow this structure:

1. load data from the API on mount
2. keep filters/search text in component state
3. compute filtered rows and selected records in memory
4. render a summary section
5. render a table/work queue
6. render a detail panel
7. if admin, render create/edit forms

Strong examples:

- [DonorsContributionsPage.tsx](/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/DonorsContributionsPage.tsx)
- [CaseloadInventoryPage.tsx](/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/CaseloadInventoryPage.tsx)
- [HomeVisitationsPage.tsx](/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/HomeVisitationsPage.tsx)
- [ReportsAnalyticsPage.tsx](/Users/lajicpajam/School/Intex II/frontend/src/pages/portal/ReportsAnalyticsPage.tsx)

## Shared UI Building Blocks

Reusable UI pieces live under `frontend/src/components/ui/`.

The most important ones are:

- cards and metrics:
  - [Cards.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/ui/Cards.tsx)
- detail panels:
  - [DetailPanel.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/ui/DetailPanel.tsx)
- forms:
  - [FormPrimitives.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/ui/FormPrimitives.tsx)
- tables:
  - [DataTable.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/ui/DataTable.tsx)
- loading/error/empty states:
  - [PageState.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/ui/PageState.tsx)

When adding new portal screens, reusing these first will keep the UI consistent.

## Styling

Most layout and design rules live in [frontend/src/styles/app.css](/Users/lajicpajam/School/Intex II/frontend/src/styles/app.css).

This project does not use Tailwind. That means:

- global class names matter
- layout fixes usually happen in `app.css`
- component files stay easier to read because styling is not embedded in long class strings

## Where To Edit Common Changes

- change route availability or navigation:
  - [App.tsx](/Users/lajicpajam/School/Intex II/frontend/src/App.tsx)
  - [AppShell.tsx](/Users/lajicpajam/School/Intex II/frontend/src/components/layout/AppShell.tsx)
- change API paths or payloads:
  - [frontend/src/api/index.ts](/Users/lajicpajam/School/Intex II/frontend/src/api/index.ts)
  - [frontend/src/api/types.ts](/Users/lajicpajam/School/Intex II/frontend/src/api/types.ts)
- change auth/session behavior:
  - [AuthContext.tsx](/Users/lajicpajam/School/Intex II/frontend/src/contexts/AuthContext.tsx)
- change layout or responsive behavior:
  - [frontend/src/styles/app.css](/Users/lajicpajam/School/Intex II/frontend/src/styles/app.css)

## Smoke Testing

The frontend smoke script lives at [frontend/scripts/smoke.mjs](/Users/lajicpajam/School/Intex II/frontend/scripts/smoke.mjs).

It checks a practical cross-section of the app:

- public navigation
- donor login and donor-only route behavior
- admin login and dashboard
- case conference UI
- reports UI

Run it after the app is already up:

```bash
cd frontend
SMOKE_BASE_URL=http://localhost:5173 npm run smoke
```
