# Auth And Session Model

This is the maintainer-facing summary of how authentication works in Tanglaw Project.

## Backend Auth Model

- ASP.NET Identity handles user records, password validation, roles, and lockout behavior.
- After a successful login, the backend issues a JWT for the frontend.
- Role policies gate access:
  - anonymous: public pages only
  - donor: donor-safe routes such as `GET /api/donations/my-history`
  - staff: read-only internal access
  - admin: create/update/delete access

## Frontend Session Model

- the frontend stores the JWT in local storage
- on refresh, `AuthContext` restores the token and calls `/api/auth/me`
- the shared API client dispatches global `401` and `403` events
- `AuthContext` reacts to those events so individual pages do not each manage session expiry

This is intentionally simple and readable for the student team. It is not pretending to be an advanced cookie/session architecture.

## Google Sign-In Readiness

- Google sign-in is optional and backend-configured
- the login page calls `GET /api/auth/providers`
- the button only appears if the backend reports `googleEnabled: true`
- current behavior links a Google identity only to an existing Tanglaw Project account matched by email
- this avoids accidental self-provisioning that would bypass the app's role-assignment flow

## Important Files

- [backend/Intex.Api/Controllers/AuthController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/AuthController.cs)
- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [frontend/src/contexts/AuthContext.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/contexts/AuthContext.tsx)
- [frontend/src/api/client.ts](/Users/lajicpajam/School/Intex%20II/frontend/src/api/client.ts)
- [frontend/src/pages/public/LoginPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/LoginPage.tsx)
- [frontend/src/pages/public/GoogleCallbackPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/GoogleCallbackPage.tsx)
