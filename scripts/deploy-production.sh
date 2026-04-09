#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_name="harborlight-nexus"
deploy_root="/home/lajicpajam/deployments"
deploy_dir="${deploy_root}/${deploy_name}"
compose_file="docker-compose.production.yml"
project_name="harborlight-nexus"
stage_dir="$(mktemp -d "${deploy_root}/${deploy_name}.staging.XXXXXX")"
env_candidates=(
  "/home/lajicpajam/projects/websites/harborlight-nexus/.env"
  "${deploy_dir}/.env"
)
env_file=""

cleanup() {
  rm -rf "${stage_dir}"
}

trap cleanup EXIT

for candidate in "${env_candidates[@]}"; do
  if [ -f "${candidate}" ]; then
    env_file="${candidate}"
    break
  fi
done

if [ -z "${env_file}" ]; then
  echo "[deploy] Missing production env file: ${env_file}" >&2
  exit 1
fi

mkdir -p "${deploy_root}"

echo "[deploy] Staging repository into ${stage_dir}"
rsync -a \
  --delete \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude 'frontend/node_modules/' \
  --exclude 'frontend/dist/' \
  --exclude 'backend/Intex.Api/bin/' \
  --exclude 'backend/Intex.Api/obj/' \
  --exclude 'backend/Intex.Api.Tests/bin/' \
  --exclude 'backend/Intex.Api.Tests/obj/' \
  "${repo_root}/" "${stage_dir}/"

stage_compose_args=(
  --project-name "${project_name}"
  --env-file "${env_file}"
  -f "${stage_dir}/${compose_file}"
)

live_compose_args=(
  --project-name "${project_name}"
  --env-file "${env_file}"
  -f "${deploy_dir}/${compose_file}"
)

echo "[deploy] Validating docker compose configuration"
docker compose "${stage_compose_args[@]}" config -q

echo "[deploy] Building images from staged checkout"
docker compose "${stage_compose_args[@]}" build

echo "[deploy] Syncing staged checkout into ${deploy_dir}"
mkdir -p "${deploy_dir}"
rsync -a --delete --exclude '.env' "${stage_dir}/" "${deploy_dir}/"

if git -C "${repo_root}" rev-parse --verify HEAD >/dev/null 2>&1; then
  git -C "${repo_root}" rev-parse HEAD > "${deploy_dir}/.deploy-rev"
fi

echo "[deploy] Recreating production services"
docker compose "${live_compose_args[@]}" down --remove-orphans
docker compose "${live_compose_args[@]}" up -d

echo "[deploy] Waiting for web container to serve root"
for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3011/ >/dev/null; then
    break
  fi

  if [ "${attempt}" -eq 20 ]; then
    echo "[deploy] Web container failed root health check" >&2
    docker compose "${live_compose_args[@]}" ps >&2 || true
    echo "[deploy] === API container logs (most likely 502 source) ===" >&2
    docker compose "${live_compose_args[@]}" logs --tail 50 harborlight_nexus_api >&2 || true
    echo "[deploy] === All container logs ===" >&2
    docker compose "${live_compose_args[@]}" logs --tail 50 >&2 || true
    exit 1
  fi

  sleep 3
done

echo "[deploy] Running deployment verification"
bash "${deploy_dir}/scripts/verify-deploy.sh"

echo "[deploy] Deployment completed successfully"
