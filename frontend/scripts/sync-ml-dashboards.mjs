import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, '..');
const src = join(frontendRoot, '..', 'ml-pipelines');
const dest = join(frontendRoot, 'public', 'ml-dashboards');

const files = [
  'counseling-admin-dashboard.html',
  'donor-churn-dashboard.html',
  'reintegration-dashboard.html',
  'social-media-dashboard.html',
  'ml-dashboard-shell.css',
  'ml-dashboard-insights.js',
  'counseling-dashboard-data.json',
  'donor-dashboard-data.json',
  'reintegration-dashboard-data.json',
  'social-dashboard-data.json',
];

mkdirSync(dest, { recursive: true });
for (const f of files) {
  cpSync(join(src, f), join(dest, f), { force: true });
}
console.log('Synced ml-dashboards → public/ml-dashboards');
