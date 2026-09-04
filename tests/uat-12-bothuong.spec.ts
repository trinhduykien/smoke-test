import { test, expect } from '@playwright/test';

/**
 * SMOKE TEST — Phân hệ BỒI THƯỜNG (Claim) — UAT: https://uat-capdon.pjico.com.vn
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session lưu trong .auth/uat.json)
 *
 * 5 trang cần kiểm tra:
 *   1) /ClaimGeneral/ObjectSearch — Tìm đối tượng lập hồ sơ bồi thường
 *   2) /ClaimGeneral/Search        — Danh sách Hồ sơ bồi thường (general)
 *   3) /ClaimCargo/SearchFTS      — Tìm kiếm toàn văn (FTS) bồi thường hàng hóa
 *   4) /ClaimCargo/ObjectSearch    — Tìm đối tượng bồi thường hàng hóa
 *   5) /ClaimCargo/Search          — Danh sách Hồ sơ bồi thường hàng hóa
 *
 * Mỗi test: goto trang → HTTP < 400 → KHÔNG phải trang lỗi server
 *           → phần tử ổn định hiển thị (heading/ input chính của trang).
 *
 * LƯU Ý QUAN SÁT TỪ PROBE (2026-09-03):
 *   - /ClaimGeneral/ObjectSearch và /ClaimGeneral/Search render tốt (HTTP 200).
 *   - CẢ 3 trang /ClaimCargo/* hiện đang bị server redirect 302 về
 *     /ErrorHandler/Index — trang lỗi tổng quát chỉ chứa chữ "Trang thông báo lỗi",
 *     kể cả khi thêm query string. Module bồi thường khác (/ClaimPerson/Search)
 *     với cùng tài khoản lại mở bình thường → nghi ngờ lỗi thật của module
 *     ClaimCargo (hoặc thiếu phân quyền riêng cho module hàng hóa).
 *   → 3 test ClaimCargo được viết như hành vi MONG ĐỢI (trang phải render nội dung),
 *     hiện tại FAIL đúng như hiện trạng lỗi — không bịa assertion để lách kết quả.
 */

// 1) Tìm đối tượng lập hồ sơ — ClaimGeneral
test('[BỒI THƯỜNG] ClaimGeneral/ObjectSearch - Tìm đối tượng lập hồ sơ tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/ClaimGeneral/ObjectSearch', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);

  const bodyText = await page.locator('body').innerText({ timeout: 30000 });
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  // Heading chính của trang
  await expect(page.getByText('Tìm đối tượng lập hồ sơ').first()).toBeVisible({ timeout: 30000 });
  // Input "Số hợp đồng" — ô tìm kiếm trung tâm của form
  await expect(page.locator('#SO_HD')).toBeVisible({ timeout: 30000 });
});

// 2) Danh sách Hồ sơ — ClaimGeneral
test('[BỒI THƯỜNG] ClaimGeneral/Search - Danh sách hồ sơ tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/ClaimGeneral/Search', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);

  const bodyText = await page.locator('body').innerText({ timeout: 30000 });
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  // Heading "Danh sách Hồ sơ"
  await expect(page.getByText('Danh sách Hồ sơ').first()).toBeVisible({ timeout: 30000 });
  // Filter "Tình trạng" của form tìm hồ sơ
  await expect(page.locator('#ttrang')).toBeVisible({ timeout: 30000 });
});

// 3) Tìm kiếm toàn văn FTS — ClaimCargo (HIỆN ĐANG LỖI: redirect về ErrorHandler/Index)
test('[BỒI THƯỜNG] ClaimCargo/SearchFTS - Tìm kiếm FTS tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/ClaimCargo/SearchFTS', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);

  const bodyText = await page.locator('body').innerText({ timeout: 30000 });
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  // Kỳ vọng: trang KHÔNG rơi vào trang lỗi tổng quát của server
  await expect(page).not.toHaveURL(/ErrorHandler\/Index/, { timeout: 30000 });
  // Kỳ vọng: có form tìm kiếm (menu top + ô nhập liệu)
  await expect(page.locator('#pjMenuSearchInput')).toBeVisible({ timeout: 30000 });
});

// 4) Tìm đối tượng — ClaimCargo (HIỆN ĐANG LỖI: redirect về ErrorHandler/Index)
test('[BỒI THƯỜNG] ClaimCargo/ObjectSearch - Tìm đối tượng tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/ClaimCargo/ObjectSearch', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);

  const bodyText = await page.locator('body').innerText({ timeout: 30000 });
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).not.toHaveURL(/ErrorHandler\/Index/, { timeout: 30000 });
  await expect(page.locator('#pjMenuSearchInput')).toBeVisible({ timeout: 30000 });
});

// 5) Danh sách Hồ sơ — ClaimCargo (HIỆN ĐANG LỖI: redirect về ErrorHandler/Index)
test('[BỒI THƯỜNG] ClaimCargo/Search - Danh sách hồ sơ hàng hóa tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/ClaimCargo/Search', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);

  const bodyText = await page.locator('body').innerText({ timeout: 30000 });
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);

  await expect(page).not.toHaveURL(/ErrorHandler\/Index/, { timeout: 30000 });
  await expect(page.locator('#pjMenuSearchInput')).toBeVisible({ timeout: 30000 });
});