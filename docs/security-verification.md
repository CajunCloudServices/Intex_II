# Security Verification Checklist

Use these checks to prove the deployed app satisfies the transport-security parts of IS 414.

## 1. HTTPS health endpoint works

```bash
curl -sS -D - -o /dev/null https://slavicsoftwaresleuths.cajuncloudservices.com/api/health
```

Expected:

- `HTTP/2 200` or another successful HTTPS status
- a valid TLS certificate in the browser

## 2. HTTP redirects to HTTPS

```bash
curl -sS -D - -o /dev/null http://slavicsoftwaresleuths.cajuncloudservices.com/api/health
```

Expected:

- `301` or `308`
- `Location: https://slavicsoftwaresleuths.cajuncloudservices.com/api/health`

## 3. HSTS header is present on HTTPS

```bash
curl -sS -D - -o /dev/null https://slavicsoftwaresleuths.cajuncloudservices.com/api/health | grep -i strict-transport-security
```

Expected:

- a `Strict-Transport-Security` response header

## 4. CSP header is present on HTTPS

```bash
curl -sS -D - -o /dev/null https://slavicsoftwaresleuths.cajuncloudservices.com/api/health | grep -i content-security-policy
```

Expected:

- a `Content-Security-Policy` response header

## 5. Production CSP does not include localhost

```bash
curl -sS -D - -o /dev/null https://slavicsoftwaresleuths.cajuncloudservices.com/api/health | grep -i content-security-policy
```

Expected:

- no `localhost` entry in `connect-src`
- only the real deployed frontend origin(s), the public API hostname, and `'self'`

## 6. RBAC smoke checks

After logging in locally or in a trusted deployed environment:

- anonymous users can open public pages only
- donor users can reach `GET /api/donations/my-history`
- donor users cannot access staff/admin routes
- staff users can read internal data but cannot create/update/delete records
- admin users can use mutation routes and can open audit history

## 7. Cookie consent and browser preference check

On the public site:

1. load the page fresh
2. confirm the cookie banner appears
3. accept the optional preference cookie
4. toggle the theme mode
5. refresh the page
6. confirm the theme preference persists

This proves the cookie banner is functional, not cosmetic.
