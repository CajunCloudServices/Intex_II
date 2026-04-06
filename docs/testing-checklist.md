# Testing Checklist

Use this checklist when demoing or grading the starter app.

## Automated checks

Run from the repo root:

```bash
dotnet test backend/Intex.Api.Tests/Intex.Api.Tests.csproj
cd frontend && npm run build
cd frontend && SMOKE_BASE_URL=http://localhost:5173 npm run smoke
```

## Manual checks

1. Open the public home page.
2. Open the public impact page and confirm it shows the seeded snapshot.
3. Open the privacy page and confirm the cookie banner is visible until accepted.
4. Log in as `admin@intex.local`.
5. Confirm the portal sidebar appears, the logged-in name and role badges render, and the admin dashboard loads summary cards.
6. Open donors and create, edit, then delete one supporter record.
7. Open caseload, process recordings, home visitations, and reports pages and confirm each page has working search/filter controls.
8. On reports, confirm the safehouse table, incident tracker, and incident detail panel all render.
9. Log out.
10. Log in as `donor@intex.local`.
11. Confirm the donor account lands in the donor history page, only sees donor navigation, and only sees its own donations.

## Video Demo Checklist

Use this order if you need a short recorded walkthrough:

1. Home page: public landing layout and nonprofit framing.
2. Impact page: public-safe metrics and timeline selection.
3. Privacy page: policy text plus cookie consent banner.
4. Login page: seeded accounts and JWT sign-in flow.
5. Admin dashboard: role badges, summary cards, and recent data tables.
6. Donors page: create, edit, and delete a supporter.
7. Caseload page: resident detail panel and starter intervention plan form.
8. Process recordings page: narrative case note flow and admin-only editing.
9. Home visitations page: field visit workflow and follow-up flags.
10. Reports page: allocation chart, safehouse operations table, and incident tracker.
11. Donor login: donor-only route and restricted navigation.

## Seeded accounts

- Admin: `admin@intex.local` / `Admin!234567`
- Staff: `staff@intex.local` / `Staff!234567`
- Donor: `donor@intex.local` / `Donor!234567`
