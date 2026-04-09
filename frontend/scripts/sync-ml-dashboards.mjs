import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, '..');
const repoRoot = join(frontendRoot, '..');
const dashboardsDir = join(repoRoot, 'ml-pipelines', 'dashboards');
const jsonSrcDir = join(repoRoot, 'ml-pipelines', 'json');
const destDir = join(frontendRoot, 'public', 'ml-dashboards');
const backendDataDir = join(repoRoot, 'backend', 'Intex.Api', 'Data', 'ml-dashboards');

const staticFiles = [
  'counseling-admin-dashboard.html',
  'donor-churn-dashboard.html',
  'reintegration-dashboard.html',
  'social-media-dashboard.html',
  'campaign-timing-dashboard.html',
  'incident-archetypes-dashboard.html',
  'intervention-mix-dashboard.html',
  'social-content-mix-dashboard.html',
  'safehouse-load-dashboard.html',
  'ml-dashboard-shell.css',
  'ml-dashboard-insights.js',
  'ml-metric-tooltip.js',
];

const jsonFiles = [
  'counseling-dashboard-data.json',
  'donor-dashboard-data.json',
  'reintegration-dashboard-data.json',
  'social-dashboard-data.json',
  'campaign-timing-dashboard-data.json',
  'incident-archetypes-dashboard-data.json',
  'intervention-mix-dashboard-data.json',
  'social-content-mix-dashboard-data.json',
  'safehouse-load-dashboard-data.json',
];

/** Same keys as MlDashboardController — load over cookies in deployed static HTML. */
const fetchReplacements = [
  ['fetch("../json/counseling-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/counseling-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/donor-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/donor-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/reintegration-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/reintegration-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/social-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/social-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/campaign-timing-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/campaign-timing-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/incident-archetypes-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/incident-archetypes-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/intervention-mix-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/intervention-mix-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/social-content-mix-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/social-content-mix-dashboard-data", { credentials: "include" })'],
  ['fetch("../json/safehouse-load-dashboard-data.json")', 'fetch("/api/ml-dashboard/data/safehouse-load-dashboard-data", { credentials: "include" })'],
];

function transformHtml(content) {
  let out = content;
  for (const [from, to] of fetchReplacements) {
    out = out.split(from).join(to);
  }
  return out;
}

mkdirSync(destDir, { recursive: true });
mkdirSync(backendDataDir, { recursive: true });

for (const name of staticFiles) {
  const raw = readFileSync(join(dashboardsDir, name), 'utf8');
  const body = name.endsWith('.html') ? transformHtml(raw) : raw;
  writeFileSync(join(destDir, name), body);
}

for (const name of jsonFiles) {
  cpSync(join(jsonSrcDir, name), join(backendDataDir, name), { force: true });
}

console.log('Synced ml-pipelines → public/ml-dashboards (HTML fetch → /api/ml-dashboard/data/...)');
console.log('Copied dashboard JSON → backend/Intex.Api/Data/ml-dashboards/');
