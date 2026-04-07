# Testing Checklist

Use this checklist when demoing or grading the starter app.

## Automated checks

Run from the repo root:

```bash
dotnet test backend/Intex.Api.Tests/Intex.Api.Tests.csproj
cd frontend && npm run build
cd frontend && SMOKE_BASE_URL=http://localhost:5173 npm run smoke
```

Why these three commands matter:

- `dotnet test` verifies backend validation, routing, and role behavior
- `npm run build` catches broken TypeScript imports and route/page compilation issues
- `npm run smoke` checks a real browser path across public pages, login, donor routing, admin routing, conferences, and reports

## Manual checks

1. Open the public home page.
2. Open the public impact page and confirm it shows the seeded snapshot.
3. Open the privacy page and confirm the cookie banner is visible until accepted.
4. Accept the optional preference cookie, toggle the theme, refresh, and confirm the theme choice persists.
5. Log in as `admin@intex.local`.
6. Confirm the portal sidebar appears, the logged-in name and role badges render, and the admin dashboard loads summary cards.
7. Open donors and create, edit, then delete one supporter record.
8. Open caseload, process recordings, home visitations, reports, and audit history pages and confirm each page has working search/filter controls.
9. On reports, confirm the safehouse table, incident tracker, and incident detail panel all render.
10. On audit history, confirm recent create/update/delete events are visible.
11. Log out.
12. Log in as `donor@intex.local`.
13. Confirm the donor account lands in the donor history page, only sees donor navigation, and does not see staff/admin links such as `Audit History`.

## Video Demo Checklist

Use this order if you need a short recorded walkthrough:

1. Home page: public landing layout and nonprofit framing.
2. Impact page: public-safe metrics and timeline selection.
3. Privacy page: policy text plus cookie consent banner.
4. Theme preference: accept optional preference cookie, toggle theme, refresh to show persistence.
5. Login page: seeded accounts and JWT sign-in flow.
6. Admin dashboard: role badges, summary cards, and recent data tables.
7. Donors page: create, edit, and delete a supporter.
8. Caseload page: resident detail panel and starter intervention plan form.
9. Process recordings page: narrative case note flow and admin-only editing.
10. Home visitations page: field visit workflow and follow-up flags.
11. Reports page: allocation chart, safehouse operations table, and incident tracker.
12. Audit history: show sensitive create/update/delete events.
13. Donor login: donor-only route and restricted navigation.

## Seeded accounts

- Admin: `admin@intex.local` / `Admin!234567`
- Staff: `staff@intex.local` / `Staff!234567`
- Donor: `donor@intex.local` / `Donor!234567`
