import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173';
const donorEmail = process.env.SMOKE_DONOR_EMAIL ?? 'donor@intex.local';
const donorPassword = process.env.SMOKE_DONOR_PASSWORD ?? 'Donor!23456789';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@intex.local';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? 'Admin!23456789';

function supporterRow(page, supporterName) {
  return page.locator('tr', { hasText: supporterName });
}

const browser = await chromium.launch({ headless: true });
const donorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await donorContext.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Providing safe homes and healing for survivors' }).waitFor();
  await page.getByRole('button', { name: 'Accept optional preference cookie' }).click();

  await page.goto(`${baseUrl}/impact`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Impact overview' }).waitFor();

  await page.goto(`${baseUrl}/privacy`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Privacy policy' }).waitFor();

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('donor@intex.local');
  await page.getByLabel('Password').fill('Donor!23456789');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/portal/my-impact');
  await page.getByRole('heading', { name: 'My impact dashboard' }).waitFor();
  await page.getByRole('link', { name: 'My Impact Dashboard' }).waitFor();
  await page.getByLabel('Prediction amount').fill('4200');
  await page.getByRole('button', { name: 'Estimate' }).click();
  await page.getByText('Predicted outcomes by program area').waitFor();
  if ((await page.getByText('Admin Dashboard').count()) !== 0) {
    throw new Error('Donor navigation exposed a staff/admin link.');
  }
  if ((await page.getByText('Audit History').count()) !== 0) {
    throw new Error('Donor navigation exposed an admin-only audit link.');
  }

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await adminPage.getByLabel('Email').fill(adminEmail);
  await adminPage.getByLabel('Password').fill(adminPassword);
  await adminPage.getByRole('button', { name: 'Sign in' }).click();
  await adminPage.waitForURL('**/portal/admin');
  await adminPage.getByRole('heading', { name: 'Admin dashboard' }).waitFor();

  await adminPage.getByRole('heading', { name: 'Upcoming case conferences' }).waitFor();

  await adminPage.goto(`${baseUrl}/portal/donors`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('heading', { name: 'Donors & contributions' }).waitFor();
  const supporterForm = adminPage.locator('form').first();
  await supporterForm.waitFor();

  const id = Date.now();
  const initialName = `Smoke Supporter ${id}`;
  const updatedName = `${initialName} Updated`;
  const email = `smoke-${id}@example.com`;

  await supporterForm.getByLabel('Display name').fill(initialName);
  await supporterForm.getByLabel('Email').fill('bad-email');
  await supporterForm.getByLabel('Supporter type').fill('CorporatePartner');
  await supporterForm.getByLabel('Status').fill('Active');
  await supporterForm.getByLabel('Relationship type').fill('International');
  await supporterForm.getByLabel('Acquisition channel').fill('Smoke Test');
  await supporterForm.getByLabel('Region').fill('Metro Manila');
  await supporterForm.getByLabel('Country').fill('Philippines');
  await supporterForm.getByRole('button', { name: 'Create supporter' }).click();
  await supporterForm.getByText('Enter a valid email address, like name@example.org.').waitFor();

  await supporterForm.getByLabel('Email').fill(email);
  await supporterForm.getByRole('button', { name: 'Create supporter' }).click();
  await adminPage.getByText('Supporter created.').waitFor();

  const supporterSearch = adminPage.getByPlaceholder('Search supporters...');
  await supporterSearch.fill(initialName);
  await supporterRow(adminPage, initialName).waitFor();
  await supporterRow(adminPage, initialName).getByRole('button', { name: 'Edit' }).evaluate((node) => node.click());
  await adminPage.getByText('Edit supporter').waitFor();

  await supporterForm.getByLabel('Display name').fill(updatedName);
  await supporterForm.getByRole('button', { name: 'Update supporter' }).click();
  await adminPage.getByText('Supporter updated.').waitFor();

  await supporterSearch.fill(updatedName);
  await supporterRow(adminPage, updatedName).waitFor();
  adminPage.once('dialog', (dialog) => dialog.accept());
  await supporterRow(adminPage, updatedName).getByRole('button', { name: 'Delete' }).evaluate((node) => node.click());
  await adminPage.getByText('Supporter deleted.').waitFor();
  await supporterRow(adminPage, updatedName).waitFor({ state: 'detached' });

  await adminPage.goto(`${baseUrl}/portal/home-visitations`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('heading', { name: 'Home visitations & case conferences' }).waitFor();
  await adminPage.getByRole('heading', { name: 'Case conference history' }).waitFor();
  await adminPage.getByRole('button', { name: 'Log Home Visit' }).waitFor();
  await adminPage.locator('table').first().getByRole('button', { name: 'View' }).first().click();
  await adminPage.getByRole('dialog', { name: 'Home visit details' }).waitFor();
  await adminPage.getByRole('button', { name: 'Close' }).click();

  await adminPage.goto(`${baseUrl}/portal/caseload`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('heading', { name: 'Caseload inventory' }).waitFor();
  const filterSelects = adminPage.locator('.filter-row select');
  const selectCount = await filterSelects.count();
  if (selectCount < 5) {
    throw new Error('Caseload is missing one or more required dedicated filter controls.');
  }
  const firstWorkerCell = adminPage.locator('table tbody tr').first().locator('td').nth(4);
  const firstWorker = (await firstWorkerCell.innerText()).trim();
  await filterSelects.nth(3).selectOption({ label: firstWorker });
  const workerCells = adminPage.locator('table tbody tr td:nth-child(5)');
  const workerValues = await workerCells.allInnerTexts();
  if (!workerValues.every((value) => value.trim() === firstWorker)) {
    throw new Error('Social worker filter did not constrain caseload rows as expected.');
  }
  await filterSelects.nth(3).selectOption({ label: 'All' });

  await adminPage.goto(`${baseUrl}/portal/reports`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('heading', { name: 'Reports & analytics' }).waitFor();
  await adminPage.getByRole('heading', { name: 'Donation trends' }).waitFor();

  await adminPage.goto(`${baseUrl}/portal/audit-history`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('heading', { name: 'Audit history' }).waitFor();

  console.log('Smoke test passed.');
} finally {
  await page.close();
  await donorContext.close();
  await browser.close();
}
