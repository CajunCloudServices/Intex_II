# Tanglaw Project Frontend

This is the React + TypeScript + Vite client for Tanglaw Project. It is intentionally simple, readable, and easy to extend.

## What This Frontend Does

- Shows public pages for visitors.
- Lets users log in with seeded admin, staff, or donor accounts.
- Routes users to the correct portal area based on role.
- Shows search/filterable tables for donor, resident, recording, visitation, and reporting screens.
- Uses a cookie-consent banner and a lightweight local JWT session for development.

## Routes

- `/` Home
- `/impact` Public impact dashboard
- `/login` Login page
- `/privacy` Privacy policy
- `/portal/admin` Admin dashboard
- `/portal/donors` Donors and contributions
- `/portal/caseload` Caseload inventory
- `/portal/process-recordings` Process recordings
- `/portal/home-visitations` Home visitations
- `/portal/reports` Reports and analytics
- `/portal/donor-history` Donor-only contribution history

## Seeded Demo Accounts

- `admin@intex.local` / `Admin!23456789`
- `staff@intex.local` / `Staff!23456789`
- `donor@intex.local` / `Donor!23456789`

## Local Dev

Set the API URL before starting the Vite server:

```bash
VITE_API_URL=http://localhost:5081/api npm run dev
```

For the full teammate setup guide, see [docs/local-development.md](/Users/lajicpajam/School/Intex%20II/docs/local-development.md).

Build the frontend:

```bash
npm run build
```

## Important Files

- [`src/App.tsx`](./src/App.tsx)
- [`src/components/layout/AppShell.tsx`](./src/components/layout/AppShell.tsx)
- [`src/contexts/AuthContext.tsx`](./src/contexts/AuthContext.tsx)
- [`src/api/client.ts`](./src/api/client.ts)
- [`src/pages/public/HomePage.tsx`](./src/pages/public/HomePage.tsx)
- [`src/pages/portal/AdminDashboardPage.tsx`](./src/pages/portal/AdminDashboardPage.tsx)
- [`src/pages/portal/DonorHistoryPage.tsx`](./src/pages/portal/DonorHistoryPage.tsx)
- [`src/styles/app.css`](./src/styles/app.css)

## Notes For Students

- The app uses plain React state on purpose. That makes the code easier to understand during INTEX work.
- Search and filter logic is local to the page components, so it is easy to replace with server-side filtering later.
- The UI is responsive, but it is still a starter. Feel free to swap the colors, layout density, and charting approach.
