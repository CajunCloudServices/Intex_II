#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-https://tanglawproject.cajuncloudservices.com}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

cookie_jar="${tmpdir}/cookies.txt"
login_headers="${tmpdir}/login-headers.txt"
login_body="${tmpdir}/login-body.json"

echo "[verify] Checking public health"
curl --fail --silent --show-error "${base_url}/api/health" >/dev/null

echo "[verify] Checking login shell and brand assets"
login_html="$(curl --fail --silent --show-error "${base_url}/login")"
grep -q '/assets/index-' <<< "${login_html}"
grep -q '/tanglaw-favicon.svg' <<< "${login_html}"
curl --fail --silent --show-error "${base_url}/tanglaw-lantern.svg" >/dev/null
curl --fail --silent --show-error "${base_url}/tanglaw-favicon.svg" >/dev/null

echo "[verify] Checking admin login cookie flow"
curl --fail --silent --show-error \
  -D "${login_headers}" \
  -c "${cookie_jar}" \
  -o "${login_body}" \
  -X POST "${base_url}/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@intex.local","password":"Admin!23456789"}'

grep -qi '^set-cookie: Intex.Auth=' "${login_headers}"
grep -q '"email":"admin@intex.local"' "${login_body}"

auth_me_json="$(curl --fail --silent --show-error \
  -b "${cookie_jar}" \
  "${base_url}/api/auth/me")"
grep -q '"email":"admin@intex.local"' <<< "${auth_me_json}"

dashboard_summary_json="$(curl --fail --silent --show-error \
  -b "${cookie_jar}" \
  "${base_url}/api/dashboard/summary")"
grep -q '"safehouseCount"' <<< "${dashboard_summary_json}"

echo "[verify] Checking ML dashboard asset and protected data"
ml_html="$(curl --fail --silent --show-error "${base_url}/ml-dashboards/counseling-admin-dashboard.html")"
grep -q '/api/ml-dashboard/data/counseling-dashboard-data' <<< "${ml_html}"
if grep -q '\.\./json/counseling-dashboard-data.json' <<< "${ml_html}"; then
  echo "[verify] ML dashboard still references ../json static data" >&2
  exit 1
fi

ml_dashboard_json="$(curl --fail --silent --show-error \
  -b "${cookie_jar}" \
  "${base_url}/api/ml-dashboard/data/counseling-dashboard-data")"
grep -q '"generated_note"' <<< "${ml_dashboard_json}"

echo "[verify] Checking donor login flow"
curl --fail --silent --show-error \
  -c "${cookie_jar}" \
  -o "${tmpdir}/donor-body.json" \
  -X POST "${base_url}/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"donor@intex.local","password":"Donor!23456789"}'

donation_prediction_json="$(curl --fail --silent --show-error \
  -b "${cookie_jar}" \
  "${base_url}/api/donations/predict-impact?amount=4200")"
grep -q '"estimatedVictimsImpacted"' <<< "${donation_prediction_json}"

echo "[verify] Deployment checks passed"
