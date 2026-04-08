# Video Demo Checklist

Use this checklist as the exact walkthrough for the IS 413 and IS 414 grading videos.

## Open with the live site

- Start on the public production URL.
- Show the browser address bar and HTTPS lock icon before navigating.
- Keep a terminal ready for the redirect, CSP, and HSTS checks.

## IS 413 walkthrough

1. Open the home page.
   Say: "Anonymous users can browse the public site, including the home, impact, privacy, and login pages."

2. Open the impact page.
   Say: "This public page shows anonymized impact reporting for donors and visitors."

3. Open the privacy page from the footer.
   Say: "The privacy policy is linked from the footer and tailored to the site."

4. Show the cookie banner.
   Accept the optional preference cookie, toggle the theme, refresh, and show that the theme persists.
   Say: "This cookie consent flow is functional. It stores a consent cookie and, if accepted, a browser-accessible theme preference."

5. Open the login page.
   Say: "The site uses username and password authentication through ASP.NET Identity."

6. Sign in as admin.
   Show the admin dashboard and its summary cards.
   Say: "The admin dashboard provides active residents, recent donations, upcoming case conferences, and summarized progress data."

7. Open Donors & Contributions.
   Show supporter records, donation records, and the detail panel.
   Create or edit one supporter.
   Delete a record and show the confirmation.

8. Open Caseload Inventory.
   Show filtering and one resident detail view.

9. Open Process Recordings.
   Show the chronological care documentation view.

10. Open Home Visitations & Case Conferences.
    Show visit history, conference history, and upcoming conferences.

11. Open Reports & Analytics.
    Show donation trends, resident outcomes, safehouse performance, reintegration, and outreach metrics.

12. Sign out and sign in as donor.
    Show donor-only navigation and the donor history page.
    Say: "Donors can view only their own contribution history and donor-safe pages."

## IS 414 walkthrough

1. Show HTTPS on the live site.
   Say: "The site is publicly deployed and served over HTTPS."

2. Show HTTP redirecting to HTTPS in the terminal or browser.
   Say: "HTTP traffic is redirected to HTTPS."

3. Show the Identity/password policy configuration in code.
   Mention the stronger-than-default rules and account lockout settings.

4. Show auth and RBAC behavior.
   - anonymous users can access public pages
   - donors cannot access staff/admin pages
   - staff is read-only
   - admin can create, update, and delete data

5. Show delete confirmation on one admin delete action.

6. Show `.env.example`, the git-ignored `.env` strategy, and the production environment guide.
   Say: "Production credentials are stored outside the codebase and injected through environment variables."

7. Return to the privacy page and point out:
   - what data is collected
   - why it is processed
   - who can access sensitive data
   - how public reporting is anonymized
   - the current use of browser storage for the portal session token

8. Show the CSP header in browser dev tools or with a terminal request.
   Say: "CSP is implemented as an HTTP header."

9. Show the HSTS header in browser dev tools or with a terminal request.
   Say: "HSTS is enabled on the deployed site."

10. Open Audit History as admin.
    Show recent create, update, or delete events.
    Say: "Sensitive admin mutations are audit logged."

## Accounts to keep ready

- Admin: `admin@intex.local` / `Admin!23456789`
- Staff: `staff@intex.local` / `Staff!23456789`
- Donor: `donor@intex.local` / `Donor!23456789`

## Final reminder

- If a feature is not shown in the video, graders can treat it as missing.
- Keep the walkthrough aligned to rubric items instead of narrating the whole codebase.
