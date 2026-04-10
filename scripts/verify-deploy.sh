#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-https://tanglawproject.cajuncloudservices.com}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

cookie_jar="${tmpdir}/cookies.txt"
login_headers="${tmpdir}/login-headers.txt"
login_body="${tmpdir}/login-body.json"

curl_retry() {
  local args=()
  while [ "$#" -gt 0 ]; do
    args+=("$1")
    shift
  done

  local attempt
  for attempt in $(seq 1 10); do
    if curl --fail --silent --show-error "${args[@]}"; then
      return 0
    fi

    if [ "${attempt}" -lt 10 ]; then
      sleep 2
    fi
  done

  return 1
}

echo "[verify] Checking public health"
curl_retry -o /dev/null "${base_url}/api/health"

echo "[verify] Checking public impact dashboard data"
public_impact_json="$(curl_retry "${base_url}/api/public-impact")"
grep -q '"snapshots"' <<< "${public_impact_json}"
grep -q '"overallSummary"' <<< "${public_impact_json}"

echo "[verify] Checking login shell and brand assets"
login_html="$(curl_retry "${base_url}/login")"
grep -q '/assets/index-' <<< "${login_html}"
grep -q '/tanglaw-favicon.svg' <<< "${login_html}"
curl_retry -o /dev/null "${base_url}/tanglaw-lantern.svg"
curl_retry -o /dev/null "${base_url}/tanglaw-favicon.svg"

echo "[verify] Checking admin login cookie flow"
curl_retry \
  -D "${login_headers}" \
  -c "${cookie_jar}" \
  -o "${login_body}" \
  -X POST "${base_url}/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"deploy-verifier@intex.local","password":"Verifier!2345678"}'

grep -qi '^set-cookie: Intex.Auth=' "${login_headers}"
grep -q '"email":"deploy-verifier@intex.local"' "${login_body}"

auth_me_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/auth/me")"
grep -q '"email":"deploy-verifier@intex.local"' <<< "${auth_me_json}"

dashboard_summary_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/dashboard/summary")"
grep -q '"safehouseCount"' <<< "${dashboard_summary_json}"

echo "[verify] Checking ML dashboard asset and protected data"
ml_html="$(curl_retry "${base_url}/ml-dashboards/counseling-admin-dashboard.html")"
grep -q '/api/ml-dashboard/data/counseling-dashboard-data' <<< "${ml_html}"
if grep -q '\.\./json/counseling-dashboard-data.json' <<< "${ml_html}"; then
  echo "[verify] ML dashboard still references ../json static data" >&2
  exit 1
fi

ml_dashboard_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/ml-dashboard/data/counseling-dashboard-data")"
grep -q '"generated_note"' <<< "${ml_dashboard_json}"

echo "[verify] Checking case-management endpoints that depend on Resident schema"
safehouses_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/safehouses")"
grep -q '"id"' <<< "${safehouses_json}"

residents_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/residents")"
grep -q '"caseControlNumber"' <<< "${residents_json}"

trend_deployments_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/reports/trend-deployments")"
grep -q '"pipelineKey"' <<< "${trend_deployments_json}"

echo "[verify] Checking donor login flow"
curl_retry \
  -c "${cookie_jar}" \
  -o "${tmpdir}/donor-body.json" \
  -X POST "${base_url}/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"donor@intex.local","password":"Donor!23456789"}'

donation_prediction_json="$(curl_retry \
  -b "${cookie_jar}" \
  "${base_url}/api/donations/predict-impact?amount=4200")"
grep -q '"estimatedVictimsImpacted"' <<< "${donation_prediction_json}"

echo "[verify] Deployment checks passed"
