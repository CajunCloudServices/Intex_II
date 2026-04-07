# Notes

- `INTEX W26 Case.md` was used to shape the starter domain fields and page/module boundaries.
- Security comments in code intentionally distinguish implemented controls from future hardening work.

## Recommended Reading Order

If you are new to the repo, read the code in this order:

1. [README.md](/Users/lajicpajam/School/Intex II/README.md)
2. [docs/criteria-map.md](/Users/lajicpajam/School/Intex II/docs/criteria-map.md)
3. [docs/backend-walkthrough.md](/Users/lajicpajam/School/Intex II/docs/backend-walkthrough.md)
4. [docs/frontend-walkthrough.md](/Users/lajicpajam/School/Intex II/docs/frontend-walkthrough.md)

That path gives you the big picture first, then the API startup/auth flow, then the React route/layout/data flow.

## Quick Mental Model

- The backend is a standard ASP.NET Core API with EF Core, Identity, JWT auth, seeded demo data, and audit logging for sensitive admin changes.
- The frontend is a Vite React app that stores the JWT in local storage, restores the user via `/api/auth/me`, gates routes by role, and uses a consent-gated theme preference cookie to satisfy the browser-storage requirement.
- Portal pages mostly follow the same pattern:
  - load several datasets with the shared API client
  - compute filtered/selected records in component state
  - show tables, detail panels, and admin-only forms
- Deployed environments should provide secrets and origins through environment variables, not code changes.
