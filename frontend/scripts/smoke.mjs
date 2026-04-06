import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173';

function supporterRow(page, supporterName) {
  return page.locator('tr', { hasText: supporterName });
}

const browser = await chromium.launch({ headless: true });
const donorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await donorContext.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Build the nonprofit app on a clean full-stack baseline.' }).waitFor();

  await page.goto(`${baseUrl}/impact`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Impact overview' }).waitFor();

  await page.goto(`${baseUrl}/privacy`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Privacy policy starter' }).waitFor();

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Donor/ }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/portal/donor-history');
  await page.getByRole('heading', { name: 'My contributions' }).waitFor();
  await page.getByRole('link', { name: 'My Contributions' }).waitFor();
  if ((await page.getByText('Admin Dashboard').count()) !== 0) {
    throw new Error('Donor navigation exposed a staff/admin link.');
  }

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('button', { name: /Admin/ }).click();
  await adminPage.getByRole('button', { name: 'Sign in' }).click();
  await adminPage.waitForURL('**/portal/admin');
  await adminPage.getByRole('heading', { name: 'Admin dashboard' }).waitFor();

  await adminPage.goto(`${baseUrl}/portal/donors`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('heading', { name: 'Donors & contributions' }).waitFor();
  const supporterForm = adminPage.locator('form').first();
  await supporterForm.waitFor();

  const id = Date.now();
  const initialName = `Smoke Supporter ${id}`;
  const updatedName = `${initialName} Updated`;
  const email = `smoke-${id}@example.com`;

  await supporterForm.locator('input').nth(0).fill(initialName);
  await supporterForm.locator('input').nth(1).fill(email);
  await supporterForm.locator('input').nth(2).fill('CorporatePartner');
  await supporterForm.locator('input').nth(3).fill('Active');
  await supporterForm.locator('input').nth(4).fill('International');
  await supporterForm.locator('input').nth(5).fill('Smoke Test');
  await supporterForm.locator('input').nth(10).fill('Metro Manila');
  await supporterForm.locator('input').nth(11).fill('Philippines');
  await supporterForm.getByRole('button', { name: 'Create supporter' }).click();
  await adminPage.getByText('Supporter created.').waitFor();

  const supporterSearch = adminPage.getByPlaceholder('Search supporters...');
  await supporterSearch.fill(initialName);
  await supporterRow(adminPage, initialName).waitFor();
  await supporterRow(adminPage, initialName).getByRole('button', { name: 'Edit' }).evaluate((node) => node.click());
  await adminPage.getByText('Edit supporter').waitFor();

  await supporterForm.locator('input').nth(0).fill(updatedName);
  await supporterForm.getByRole('button', { name: 'Update supporter' }).click();
  await adminPage.getByText('Supporter updated.').waitFor();

  await supporterSearch.fill(updatedName);
  await supporterRow(adminPage, updatedName).waitFor();
  adminPage.once('dialog', (dialog) => dialog.accept());
  await supporterRow(adminPage, updatedName).getByRole('button', { name: 'Delete' }).evaluate((node) => node.click());
  await adminPage.getByText('Supporter deleted.').waitFor();
  await supporterRow(adminPage, updatedName).waitFor({ state: 'detached' });

  console.log('Smoke test passed.');
} finally {
  await page.close();
  await donorContext.close();
  await browser.close();
}
