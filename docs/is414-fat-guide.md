# IS 414 Fat Guide

This file is the one-stop walkthrough for the IS 414 security requirements.

For each requirement, this guide includes:

- the requirement wording used for grading
- what it means in plain English
- where it lives in the repo
- what it is doing technically
- what to show in the video
- what to say in plain English

Important note:

- this guide is about the **implementation in the repo**
- for transport-security items like HTTPS, redirect, HSTS, and CSP, you still need to show the **live deployed site** in the video

## 1. Credentials stored securely outside the codebase (`.env` / secrets manager)

### Requirement

`Credentials stored securely outside the codebase (.env / secrets manager)`

### Plain English

Real passwords, OAuth client secrets, database credentials, and production configuration should not be hardcoded in the repo. They should come from environment variables or a deployment secret store.

### Where It Is In The Repo

- [`.env.example`](/Users/lajicpajam/School/Intex%20II/.env.example)
- [`.gitignore`](/Users/lajicpajam/School/Intex%20II/.gitignore)
- [docker-compose.production.yml](/Users/lajicpajam/School/Intex%20II/docker-compose.production.yml)
- [README.md](/Users/lajicpajam/School/Intex%20II/README.md)
- [docs/production-environment.md](/Users/lajicpajam/School/Intex%20II/docs/production-environment.md)
- [.github/workflows/deploy.yml](/Users/lajicpajam/School/Intex%20II/.github/workflows/deploy.yml)

### What It Is Doing Technically

- the repo contains a sample `.env.example`, not real secrets
- `.env` is ignored by git
- production compose expects secrets from environment variables
- the docs explain that real values are injected at deploy time

### What To Show In The Video

1. Open [`.env.example`](/Users/lajicpajam/School/Intex%20II/.env.example)
2. Open [`.gitignore`](/Users/lajicpajam/School/Intex%20II/.gitignore) and show `.env` is ignored
3. Open [docs/production-environment.md](/Users/lajicpajam/School/Intex%20II/docs/production-environment.md)
4. Open [docker-compose.production.yml](/Users/lajicpajam/School/Intex%20II/docker-compose.production.yml) and show env-based injection

### What To Say

“Production credentials are not committed into the repo. The repo only includes a sample env file, the real `.env` is git-ignored, and production values are injected through environment variables during deployment.”

## 2. Authenticated login with username/password using ASP.NET Identity

### Requirement

`Authenticated login with username/password using ASP.NET Identity`

### Plain English

Users should log in with a username/email and password using ASP.NET Identity, not a fake or custom insecure login system.

### Where It Is In The Repo

- [backend/Intex.Api/ApplicationUser.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/ApplicationUser.cs)
- [backend/Intex.Api/Data/ApplicationDbContext.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Data/ApplicationDbContext.cs)
- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [backend/Intex.Api/Controllers/AuthController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/AuthController.cs)
- [frontend/src/pages/public/LoginPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/LoginPage.tsx)
- [frontend/src/contexts/AuthContext.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/contexts/AuthContext.tsx)

### What It Is Doing Technically

- `ApplicationUser` is the Identity user model
- `ApplicationDbContext` inherits from Identity EF Core context
- `Program.cs` wires Identity, password rules, lockout, roles, and cookie-session auth
- `AuthController` exposes login, register, provider discovery, and `/auth/me`
- the frontend login form sends credentials to `/api/auth/login`
- after successful login, the backend establishes a server-side session cookie and the frontend restores the user with `/api/auth/me`

### What To Show In The Video

1. Open [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
2. Open [backend/Intex.Api/Controllers/AuthController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/AuthController.cs)
3. Open [frontend/src/pages/public/LoginPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/LoginPage.tsx)
4. Log in through the UI

### What To Say

“This app uses ASP.NET Identity for username and password authentication. The backend validates the login and establishes a secure session cookie, and the React frontend restores the current user through `/api/auth/me`.”

## 3. Strong password policy and account lockout

### Requirement

`Password policy and lockout configured according to class security expectations`

### Plain English

Passwords should not be weak, and repeated failed logins should eventually lock the account temporarily.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [backend/Intex.Api.Tests/ApiValidationTests.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api.Tests/ApiValidationTests.cs)

### What It Is Doing Technically

In `Program.cs`, Identity is configured with:

- minimum length
- uppercase required
- lowercase required
- digit required
- non-alphanumeric required
- unique email required
- max failed attempts
- lockout duration

### What To Show In The Video

1. Open [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
2. Point at the Identity options block

### What To Say

“We configured a stronger-than-default password policy and enabled account lockout after repeated failed attempts. That gives us visible password-strength and brute-force protection.”

## 4. Role-based access control (RBAC)

### Requirement

`Role-based access control`

### Plain English

Different kinds of users should only see and do what their role allows. Anonymous users should only see public pages. Donors should not get staff/admin access. Staff should be read-only. Admin should be the only role allowed to create, update, and delete records.

### Where It Is In The Repo

- [backend/Intex.Api/Authorization/RoleNames.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Authorization/RoleNames.cs)
- [backend/Intex.Api/Authorization/Policies.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Authorization/Policies.cs)
- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [backend/Intex.Api/Controllers/](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/)
- [frontend/src/components/ProtectedRoute.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/ProtectedRoute.tsx)
- [frontend/src/components/layout/AppShell.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/layout/AppShell.tsx)
- [frontend/src/App.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/App.tsx)
- [frontend/scripts/smoke.mjs](/Users/lajicpajam/School/Intex%20II/frontend/scripts/smoke.mjs)

### What It Is Doing Technically

- backend policies define `AdminOnly`, `StaffOrAdmin`, and `DonorOnly`
- controllers use `[Authorize]` and policy attributes
- the frontend route tree protects portal pages by role
- the shell hides admin/staff navigation from donor users
- the smoke test explicitly checks donor navigation does not expose admin routes

### What To Show In The Video

1. Open [backend/Intex.Api/Authorization/Policies.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Authorization/Policies.cs)
2. Open one admin-only controller action, like [backend/Intex.Api/Controllers/DonationsController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/DonationsController.cs)
3. Log in as donor and show limited navigation
4. Log in as admin and show mutation controls

### What To Say

“RBAC is enforced on both the backend and frontend. Anonymous users only see public pages, donors only see donor-safe routes, staff is read-only, and admin is the only role that can create, update, or delete records.”

## 5. Delete confirmation for destructive actions

### Requirement

`Delete actions require confirmation`

### Plain English

The app should make accidental deletes harder by requiring an explicit confirmation step.

### Where It Is In The Repo

- [backend/Intex.Api/Controllers/DonationsController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/DonationsController.cs)
- [backend/Intex.Api/Controllers/SupportersController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/SupportersController.cs)
- [backend/Intex.Api/Controllers/ResidentsController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/ResidentsController.cs)
- same pattern across the other CRUD controllers in [backend/Intex.Api/Controllers/](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/)
- frontend delete flows in the main portal pages under [frontend/src/pages/portal/](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/portal/)

### What It Is Doing Technically

- backend delete endpoints require `?confirm=true`
- frontend shows a confirmation dialog before sending the delete request
- the server rejects missing confirmation

### What To Show In The Video

1. Go to a CRUD page like donors
2. Click delete on a record
3. Show the confirmation dialog
4. Optionally show the backend route if you want to reinforce the server-side protection

### What To Say

“Deletes are confirmation-based in both the UI and the API contract. The user sees a confirmation prompt, and the server also expects an explicit confirmation flag.”

## 6. Privacy policy page

### Requirement

`Tailored privacy policy`

### Plain English

The site should have a real privacy page that explains what data is collected, why it is used, who can access it, and how sensitive data is protected.

### Where It Is In The Repo

- [frontend/src/pages/public/PrivacyPolicyPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/PrivacyPolicyPage.tsx)
- [frontend/src/components/layout/AppShell.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/layout/AppShell.tsx)

### What It Is Doing Technically

The privacy page explicitly covers:

- supporter and donation data
- staff and donor account data
- resident-care records
- anonymized public reporting
- who can access sensitive records
- cookie/browser storage usage
- current portal session and preference storage behavior

### What To Show In The Video

1. Open the privacy page from the footer
2. Scroll through the sections
3. Point out the data collection, purpose, access, anonymization, and browser-storage sections

### What To Say

“This is a tailored privacy policy for the app. It explains what data we collect, why we process it, who can access sensitive information, and how public reporting is anonymized.”

## 7. Cookie banner that is actually functional

### Requirement

`Functional cookie consent banner`

### Plain English

The banner should do something real. It should not just be a fake dismiss box. It should store consent and affect whether an optional browser-stored preference is persisted.

### Where It Is In The Repo

- [frontend/src/components/ui/CookieConsentBanner.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/ui/CookieConsentBanner.tsx)
- [frontend/src/lib/browserPreferences.ts](/Users/lajicpajam/School/Intex%20II/frontend/src/lib/browserPreferences.ts)
- [frontend/src/components/layout/AppShell.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/layout/AppShell.tsx)
- [frontend/src/pages/public/PrivacyPolicyPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/PrivacyPolicyPage.tsx)

### What It Is Doing Technically

- stores a consent cookie
- if the user accepts optional settings, the app stores a browser-accessible theme preference
- if the user does not accept, the optional preference is not persisted
- this makes the consent flow functional rather than cosmetic

### What To Show In The Video

1. Load the site fresh so the cookie banner appears
2. Accept the optional preference cookie
3. Toggle the theme
4. Refresh
5. Show the theme persisted

### What To Say

“The cookie banner is functional. It stores the consent choice, and only if optional preferences are accepted does the app persist the theme preference in browser storage.”

## 8. HTTPS / TLS

### Requirement

`Use HTTPS/TLS`

### Plain English

The live deployed site should be served securely over HTTPS.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [docs/security-verification.md](/Users/lajicpajam/School/Intex%20II/docs/security-verification.md)
- [docs/video-demo-checklist.md](/Users/lajicpajam/School/Intex%20II/docs/video-demo-checklist.md)

### What It Is Doing Technically

- the app enables HTTPS redirection outside development
- deployment docs and verification docs tell you how to prove the live site is actually serving HTTPS

### What To Show In The Video

1. Open the live site
2. Show the browser address bar with HTTPS / lock icon

### What To Say

“The deployed site is served over HTTPS, so browser traffic is encrypted in transit.”

## 9. Redirect HTTP to HTTPS

### Requirement

`Redirect HTTP to HTTPS`

### Plain English

If someone visits the insecure HTTP version, the app should redirect them to the secure HTTPS version.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [docs/security-verification.md](/Users/lajicpajam/School/Intex%20II/docs/security-verification.md)

### What It Is Doing Technically

- `UseHttpsRedirection()` is enabled outside development
- the verification doc gives the exact curl command to prove the redirect on the deployed host

### What To Show In The Video

In a terminal:

```bash
curl -sS -D - -o /dev/null http://YOUR_HOST/api/health
```

Then show the `301` or `308` and the `Location: https://...` header.

### What To Say

“If someone hits the insecure HTTP URL, the app redirects them to the secure HTTPS endpoint automatically.”

## 10. CSP header

### Requirement

`Content-Security-Policy implemented as an HTTP header`

### Plain English

CSP helps limit where scripts, styles, images, and network requests can come from. It reduces the damage of script injection and other browser-side attacks.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [docs/security-verification.md](/Users/lajicpajam/School/Intex%20II/docs/security-verification.md)

### What It Is Doing Technically

- the backend writes a `Content-Security-Policy` response header
- development allows localhost origins for local dev
- production builds a tighter least-privilege `connect-src`

### What To Show In The Video

1. Open [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
2. Point to the CSP header block
3. In a terminal or browser dev tools, show the live response header

### What To Say

“CSP is implemented as an HTTP response header. It restricts what the browser can load and where network requests are allowed to go.”

## 11. HSTS header

### Requirement

`HSTS enabled`

### Plain English

HSTS tells browsers to use HTTPS for the site and avoid going back to insecure HTTP after the secure version is known.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [docs/security-verification.md](/Users/lajicpajam/School/Intex%20II/docs/security-verification.md)

### What It Is Doing Technically

- `UseHsts()` is enabled outside development
- the verification doc gives the exact command to show the `Strict-Transport-Security` header on the deployed site

### What To Show In The Video

In a terminal:

```bash
curl -sS -D - -o /dev/null https://YOUR_HOST/api/health | grep -i strict-transport-security
```

### What To Say

“HSTS is enabled so browsers are instructed to keep using HTTPS for the site after the first secure visit.”

## 12. Security headers beyond CSP/HSTS

### Requirement

`Basic security headers`

### Plain English

The app should send common hardening headers that reduce browser-side risks.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)

### What It Is Doing Technically

The backend sets:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### What To Show In The Video

1. Open the security-header block in [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
2. Optionally show them in dev tools response headers

### What To Say

“In addition to HTTPS, CSP, and HSTS, the API also sends common hardening headers like frame protection, content-type sniffing protection, and a restrictive permissions policy.”

## 13. Audit logging for sensitive actions

### Requirement

`Additional security feature: audit logging for sensitive admin actions`

### Plain English

When admins create, update, or delete sensitive records, the system should keep a change trail.

### Where It Is In The Repo

- [backend/Intex.Api/Services/AuditLogService.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Services/AuditLogService.cs)
- [backend/Intex.Api/Controllers/AuditLogController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/AuditLogController.cs)
- audit calls across CRUD controllers, for example:
  - [backend/Intex.Api/Controllers/ResidentsController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/ResidentsController.cs)
  - [backend/Intex.Api/Controllers/DonationsController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/DonationsController.cs)
  - [backend/Intex.Api/Controllers/IncidentReportsController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/IncidentReportsController.cs)
  - [backend/Intex.Api/Controllers/CaseConferencesController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/CaseConferencesController.cs)
- [frontend/src/pages/portal/AuditHistoryPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/portal/AuditHistoryPage.tsx)

### What It Is Doing Technically

- backend writes audit events for sensitive admin mutations
- audit events record action type, entity type, entity id, actor, timestamp, and summary
- admin-only UI displays the audit trail

### What To Show In The Video

1. Perform one admin create, update, or delete action
2. Open the audit history page
3. Show the resulting audit event

### What To Say

“Sensitive admin mutations are audit logged. That gives us a visible accountability trail for important record changes.”

## 14. Browser-accessible preference tied to consent

### Requirement

`Additional security/privacy feature: browser-accessible preference tied to consent`

### Plain English

This is the second extra feature: the app only persists the optional theme preference if the user accepts the optional preference cookie.

### Where It Is In The Repo

- [frontend/src/components/ui/CookieConsentBanner.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/ui/CookieConsentBanner.tsx)
- [frontend/src/lib/browserPreferences.ts](/Users/lajicpajam/School/Intex%20II/frontend/src/lib/browserPreferences.ts)
- [frontend/src/components/layout/AppShell.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/components/layout/AppShell.tsx)

### What It Is Doing Technically

- stores the consent cookie
- toggles the theme
- persists theme only when optional consent exists
- clears optional preference persistence otherwise

### What To Show In The Video

Same as the cookie banner walkthrough.

### What To Say

“This is a real browser-storage feature tied to consent. Optional preferences only persist if the user agrees to them.”

## 15. Tests and verification proving the security work

### Requirement

`Security functionality should be testable and documented`

### Plain English

It is not enough to say the feature exists. The repo should include tests and documentation that help prove the security work is real.

### Where It Is In The Repo

- [backend/Intex.Api.Tests/](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api.Tests/)
- [frontend/scripts/smoke.mjs](/Users/lajicpajam/School/Intex%20II/frontend/scripts/smoke.mjs)
- [docs/security-verification.md](/Users/lajicpajam/School/Intex%20II/docs/security-verification.md)
- [docs/video-demo-checklist.md](/Users/lajicpajam/School/Intex%20II/docs/video-demo-checklist.md)
- [docs/developer-verification.md](/Users/lajicpajam/School/Intex%20II/docs/developer-verification.md)

### What It Is Doing Technically

- backend tests cover validation, routes, auth, and access behavior
- smoke script covers public navigation, donor RBAC, admin flows, and audit-related portal behavior
- security verification doc gives exact terminal checks for deployment-level proof

### What To Show In The Video

1. Show the test files or test command briefly
2. Show the security verification doc
3. Use the doc as the basis for your live curl checks

### What To Say

“The security features are not just mentioned in prose. The repo includes backend tests, a frontend smoke script, and a deployment verification checklist for the transport-security items.”

## 16. Google sign-in readiness

### Requirement

`Optional external authentication enhancement`

### Plain English

This is not required to satisfy the base 414 implementation, but it is present as a controlled enhancement. It is optional and only activates when backend credentials are provided.

### Where It Is In The Repo

- [backend/Intex.Api/Program.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Program.cs)
- [backend/Intex.Api/Controllers/AuthController.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/Controllers/AuthController.cs)
- [backend/Intex.Api/GoogleTokenRedirectUriHandler.cs](/Users/lajicpajam/School/Intex%20II/backend/Intex.Api/GoogleTokenRedirectUriHandler.cs)
- [frontend/src/pages/public/LoginPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/LoginPage.tsx)
- [frontend/src/pages/public/GoogleCallbackPage.tsx](/Users/lajicpajam/School/Intex%20II/frontend/src/pages/public/GoogleCallbackPage.tsx)
- [docs/auth-session-model.md](/Users/lajicpajam/School/Intex%20II/docs/auth-session-model.md)

### What It Is Doing Technically

- backend only enables Google when client ID and secret exist
- login page asks `/api/auth/providers` whether Google is enabled
- Google sign-in links only to existing Tanglaw accounts matched by email

### What To Show In The Video

Only show this if it is configured and working in the environment you are recording.

### What To Say

“Google sign-in is supported as an optional enhancement, but it is intentionally gated so it only activates when backend credentials are configured and it only links to existing accounts.”

## Best 414 Video Order

If you want the smoothest order for the recording:

1. Show HTTPS on the live site
2. Show HTTP redirect to HTTPS
3. Show the login page
4. Show Identity/password policy in code
5. Show admin login
6. Show RBAC behavior across admin/donor/staff
7. Show one delete confirmation
8. Show audit history
9. Show privacy page
10. Show cookie banner + theme persistence
11. Show `.env.example`, `.gitignore`, and production environment docs
12. Show CSP and HSTS headers in terminal or dev tools

## Best “Sherlock-Proof” Explanation

If you need one clean summary at the end of the video:

“IS 414 is satisfied by a combination of ASP.NET Identity login, strong password and lockout rules, role-based authorization, explicit delete confirmation, environment-based secret handling, a tailored privacy policy, a functional cookie consent flow, CSP and HSTS security headers, HTTPS redirection, and audit logging for sensitive admin actions.”
