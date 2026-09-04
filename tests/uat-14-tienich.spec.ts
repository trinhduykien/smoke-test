import { test, expect } from '@playwright/test';

/**
 * BƯỚC 4 — Smoke test phân hệ "TIỆN ÍCH" UAT: https://uat-capdon.pjico.com.vn
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session lưu sẵn .auth/uat.json)
 *
 * Phạm vi (6 trang, chỉ đọc — KHÔNG bấm nút Lưu/Thêm/Xóa/Duyệt):
 *   1. /ContractPublic/BrowerEnd                  — Chấm dứt hợp đồng
 *   2. /ContractPublic/BrowserSearch              — Duyệt hợp đồng
 *   3. /Profit/CASearchObjects                    — Tìm thông tin người được bảo hiểm
 *   4. /ContractRecive/Search                     — Nhận dữ liệu phát sinh GCN từ Kênh bán
 *   5. /ContractRecive/SearchContractPremia       — Nhận dữ liệu phát sinh GCN từ Premia
 *   6. /CoInsurance/CoInsuranceReconciliation    — Đối soát đồng bảo hiểm (probe: HTTP 500)
 *
 * Mỗi test: goto → assert HTTP status → assert không phải trang lỗi server
 * → assert 1-2 phần tử ổn định (heading chính, nút Tìm kiếm hoặc input số HĐ).
 */

const URLS = {
  browerEnd: '/ContractPublic/BrowerEnd',
  browserSearch: '/ContractPublic/BrowserSearch',
  caSearchObjects: '/Profit/CASearchObjects',
  contractReciveSearch: '/ContractRecive/Search',
  contractRecivePremia: '/ContractRecive/SearchContractPremia',
  coInsuranceReconciliation: '/CoInsurance/CoInsuranceReconciliation',
};

// Selector heading dùng đúng kiểu probe đã quan sát được (h1-h4, .page-title, [class*=title])

async function assertNotServerError(page: import('@playwright/test').Page) {
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText, 'Trang không được hiển thị nội dung lỗi server').not.toMatch(/Server Error|Runtime Error|Exception/i);
}

test('[TIỆN ÍCH] Chấm dứt hợp đồng (BrowerEnd) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(URLS.browerEnd, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);
  // Heading chính + nút Tìm kiếm + ô số hợp đồng (ổn định theo probe)
  await expect(page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'Chấm dứt hợp đồng' }).first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#so_hd')).toBeVisible({ timeout: 30000 });
  // Nút "Tìm kiếm" trên trang này là <a class="btn btn-submit"> (probe xác nhận), không phải <button>
  await expect(page.locator('a.btn-submit', { hasText: 'Tìm kiếm' })).toBeVisible({ timeout: 30000 });
});

test('[TIỆN ÍCH] Duyệt hợp đồng (BrowserSearch) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(URLS.browserSearch, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);
  await expect(page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'Duyệt hợp đồng' }).first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#so_hd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Tìm kiếm' })).toBeVisible({ timeout: 30000 });
});

test('[TIỆN ÍCH] Tìm thông tin người được bảo hiểm (CASearchObjects) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(URLS.caSearchObjects, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);
  await expect(page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'Tìm thông tin người được bảo hiểm' }).first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#so_hd')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Tìm kiếm' })).toBeVisible({ timeout: 30000 });
});

test('[TIỆN ÍCH] Nhận dữ liệu GCN từ Kênh bán (ContractRecive/Search) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(URLS.contractReciveSearch, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);
  await expect(page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'Danh sách đơn bán qua kênh cần nhận về' }).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Tìm giấy chứng nhận' })).toBeVisible({ timeout: 30000 });
});

test('[TIỆN ÍCH] Nhận dữ liệu GCN từ Premia (SearchContractPremia) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(URLS.contractRecivePremia, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);
  await expect(page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'Danh sách đơn cần nhận về từ Premia' }).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Tìm giấy chứng nhận' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Nhận về in Hợp đồng' })).toBeVisible({ timeout: 30000 });
});

// Probe cho thấy trang này trả HTTP 500 ("Error. An error occurred while processing your request.").
// Test viết bình thường (kỳ vọng trang tải OK) — FAIL là hành vi thật của app, ghi nhận vào pagesProblem.
test('[TIỆN ÍCH] Đối soát đồng bảo hiểm (CoInsuranceReconciliation) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(URLS.coInsuranceReconciliation, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status(), 'Kỳ vọng HTTP < 400 nhưng app UAT hiện trả 500').toBeLessThan(400);
  await assertNotServerError(page);
  await expect(page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: /Đối soát/i }).first()).toBeVisible({ timeout: 30000 });
});