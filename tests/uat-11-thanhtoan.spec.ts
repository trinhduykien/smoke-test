import { test, expect } from '@playwright/test';

/**
 * Smoke test phân hệ THANH TOÁN — UAT: https://uat-capdon.pjico.com.vn
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session lưu trong .auth/uat.json)
 *
 * 5 trang được kiểm tra (chỉ đọc — KHÔNG bấm nút tạo/sửa/xóa/lưu):
 *   1) /InsuranceFee/SearchPaymentFts        — Tra cứu thông tin thanh toán
 *   2) /InsuranceFee/SearchInvoiceFTS         — Tra cứu danh sách Hóa đơn phát hành
 *   3) /InsuranceFee/Debts                    — Công nợ khách hàng
 *   4) /CoInsurance/Debts                     — Công nợ đồng bảo hiểm
 *   5) /InsuranceCommission/DebtsAgen         — Công nợ đại lý
 *
 * Mỗi test: goto trang → assert HTTP 200 (probe xác nhận) → body không chứa
 * text lỗi server → tiêu đề trang và ô nhập/nút tìm kiếm hiển thị (phần tử
 * ổn định, không phụ thuộc AJAX/animate).
 */


test('[THANH TOÁN] Tra cứu thông tin thanh toán tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/InsuranceFee/SearchPaymentFts', { timeout: 90000, waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).toHaveTitle(/Tra cứu thông tin thanh toán/i);
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /^Tìm kiếm$/ }).or(page.getByText('Tìm kiếm', { exact: true })).first()).toBeVisible({ timeout: 30000 });
});

test('[THANH TOÁN] Tra cứu Hóa đơn phát hành tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/InsuranceFee/SearchInvoiceFTS', { timeout: 90000, waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).toHaveTitle(/Tra cứu danh sách Hóa đơn phát hành/i);
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: /^Tìm kiếm$/ }).or(page.getByText('Tìm kiếm', { exact: true })).first()).toBeVisible({ timeout: 30000 });
});

test('[THANH TOÁN] Công nợ khách hàng tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/InsuranceFee/Debts', { timeout: 90000, waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).toHaveTitle(/Công nợ khách hàng/i);
  await expect(page.locator('#tim_ngayd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Chứng từ công nợ khách hàng', { exact: true }).first()).toBeVisible({ timeout: 30000 });
});

test('[THANH TOÁN] Công nợ đồng bảo hiểm tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/CoInsurance/Debts', { timeout: 90000, waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).toHaveTitle(/Công nợ nhà bảo hiểm/i);
  await expect(page.locator('#tim_ngayd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Công nợ đồng bảo hiểm', { exact: true }).first()).toBeVisible({ timeout: 30000 });
});

test('[THANH TOÁN] Công nợ đại lý tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/InsuranceCommission/DebtsAgen', { timeout: 90000, waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).toHaveTitle(/Công nợ đại lý/i);
  await expect(page.locator('#tim_ngayd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Chứng từ công nợ đại lý', { exact: true }).first()).toBeVisible({ timeout: 30000 });
});