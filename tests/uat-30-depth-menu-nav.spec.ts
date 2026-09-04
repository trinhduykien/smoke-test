import { test, expect, type Page } from '@playwright/test';

/**
 * DEPTH TEST — Khu vực "ĐIỀU HƯỚNG QUA MENU THẬT" (slug: 01-menu-nav)
 * App UAT cấp đơn bảo hiểm PJICO: https://uat-capdon.pjico.com.vn
 * Session đăng nhập lưu sẵn .auth/uat.json (tài khoản TRINH DUY KIEN (TCT)).
 *
 * Mục đích: phát hiện href menu sai hoặc event menu không gắn — KHÔNG goto trực tiếp
 * tới trang đích, mà đi từ /Home/Index → hover menu cha → click mục con trong panel.
 * (Hành vi thật được xác nhận bằng probe: probe-depth-01-menu-nav.js, -01b, -01c)
 *
 * 3 luồng được test (menu cha → mục con → URL + tiêu đề trang đích):
 *   1. CẤP ĐƠN    → "Cấp đơn xe ô tô"        → /ContractCar/Search
 *                  Title: "Xe cơ giới: Tìm kiếm hợp đồng / giấy chứng nhận - PJICO: ..."
 *   2. THANH TOÁN → "Thanh toán phí"          → /InsuranceFee/SearchPaymentFts
 *                  Title: "Tra cứu thông tin thanh toán - PJICO: ..."
 *   3. TIỆN ÍCH   → "Tra cứu HĐ bảo hiểm"     → /Profit/CASearchObjects
 *                  Title: "Tìm Thông tin người được bảo hiểm - PJICO: ..."
 *
 * Ghi chú hành vi thật (từ probe):
 *   - Text menu trong DOM hiển thị HOA bằng CSS ("CẤP ĐƠN") → locator dùng regex /i.
 *   - Menu top bar render KHÔNG đồng thời với domcontentloaded (probe thấy count=0
 *     ngay sau load) → luôn chờ toggle visible (auto-wait 30s) trước khi hover.
 *   - Menu cha mở bằng HOVER; KHÔNG click toggle (click lần 2 sẽ ĐÓNG panel).
 *   - Panel con nằm trong cùng ".pj-top-item" với toggle → ".pj-menu-panel".
 *
 * CHỈ ĐỌC: chỉ điều hướng qua menu; KHÔNG bấm Lưu/Thêm/Xóa/Trình duyệt/Đăng xuất.
 */

// Menu top cần độ rộng đủ để không item nào bị gộp vào "THÊM" (overflow) — probe dùng 1600px
test.use({ viewport: { width: 1600, height: 900 } });

const HOME = '/Home/Index';

async function assertNotServerError(page: Page) {
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText, 'Trang không được hiển thị nội dung lỗi server').not.toMatch(/Server Error|Runtime Error|Exception/i);
  return bodyText;
}

// Toggle menu cha theo text (regex /i vì CSS in hoa text DOM)
function topMenuToggle(page: Page, menuName: string) {
  return page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: new RegExp('^\\s*' + menuName + '\\s*$', 'i') })
    .first();
}

// Panel dropdown nằm trong cùng ".pj-top-item" với toggle
function topMenuPanel(page: Page, menuName: string) {
  return topMenuToggle(page, menuName)
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
}

// Link mục con trong panel theo text chính xác
function panelItemLink(page: Page, menuName: string, itemText: string) {
  return topMenuPanel(page, menuName).locator('a').filter({ hasText: itemText }).first();
}

/**
 * Luồng chung: goto Home → chờ menu → hover menu cha → panel hiện → click mục con.
 * Trả về page để assert tiếp URL/title/nội dung trang đích.
 */
async function navigateViaMenu(page: Page, menuName: string, itemText: string) {
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status(), 'GET /Home/Index phải trả 200').toBe(200);

  // Chờ menu top bar được app JS render (không có ngay sau domcontentloaded)
  await expect(topMenuToggle(page, menuName)).toBeVisible({ timeout: 30000 });

  // Mở dropdown bằng HOVER (KHÔNG click toggle — click lần 2 sẽ đóng panel)
  await topMenuToggle(page, menuName).hover();
  await expect(topMenuPanel(page, menuName)).toBeVisible({ timeout: 30000 });
  await expect(
    topMenuPanel(page, menuName).getByText(itemText, { exact: true })
  ).toBeVisible({ timeout: 30000 });

  // Click mục con thật (đi qua href của menu, không goto trực tiếp)
  await panelItemLink(page, menuName, itemText).click({ timeout: 30000 });
}

/* ============ 1. MENU CẤP ĐƠN → "Cấp đơn xe ô tô" → /ContractCar/Search ============ */

test('[MENU-NAV] Cấp đơn → hover menu CẤP ĐƠN → click "Cấp đơn xe ô tô" → /ContractCar/Search', async ({ page }) => {
  test.setTimeout(120000);

  // Kiểm href của mục menu trước khi click (phát hiện href menu sai)
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await expect(topMenuToggle(page, 'Cấp đơn')).toBeVisible({ timeout: 30000 });
  await topMenuToggle(page, 'Cấp đơn').hover();
  await expect(topMenuPanel(page, 'Cấp đơn')).toBeVisible({ timeout: 30000 });
  await expect(panelItemLink(page, 'Cấp đơn', 'Cấp đơn xe ô tô')).toHaveAttribute('href', '/ContractCar/Search', { timeout: 30000 });

  await panelItemLink(page, 'Cấp đơn', 'Cấp đơn xe ô tô').click({ timeout: 30000 });

  // Điều hướng tới trang tìm kiếm hợp đồng xe cơ giới
  await expect(page).toHaveURL(/\/ContractCar\/Search/, { timeout: 60000 });
  await expect(page).toHaveTitle(/Xe cơ giới: Tìm kiếm hợp đồng \/ giấy chứng nhận.*PJICO/i, { timeout: 30000 });
  await assertNotServerError(page);

  // Nội dung trang đích hiển thị thật (không nằm trong modal ẩn):
  // tiêu đề khối tìm kiếm + nút "Tìm Kiếm" (chỉ kiểm tra hiển thị, KHÔNG bấm)
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText).toMatch(/Tìm hợp đồng \/ Giấy chứng nhận xe cơ giới/i);
  await expect(page.getByRole('button', { name: /tìm kiếm/i }).first()).toBeVisible({ timeout: 30000 });
});

/* ===== 2. MENU THANH TOÁN → "Thanh toán phí" → /InsuranceFee/SearchPaymentFts ===== */

test('[MENU-NAV] Thanh toán → hover menu THANH TOÁN → click "Thanh toán phí" → /InsuranceFee/SearchPaymentFts', async ({ page }) => {
  test.setTimeout(120000);

  await navigateViaMenu(page, 'Thanh toán', 'Thanh toán phí');

  await expect(page).toHaveURL(/\/InsuranceFee\/SearchPaymentFts/, { timeout: 60000 });
  await expect(page).toHaveTitle(/Tra cứu thông tin thanh toán.*PJICO/i, { timeout: 30000 });
  await assertNotServerError(page);

  // Nội dung trang đích hiển thị thật: bộ lọc "Loại bảo hiểm" + nút "Tìm kiếm"
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText).toMatch(/Tra cứu thông tin thanh toán/i);
  expect(bodyText).toMatch(/Loại bảo hiểm/i);
  await expect(page.getByRole('button', { name: /tìm kiếm/i }).first()).toBeVisible({ timeout: 30000 });
});

/* ========= 3. MENU TIỆN ÍCH → "Tra cứu HĐ bảo hiểm" → /Profit/CASearchObjects ========= */

test('[MENU-NAV] Tiện ích → hover menu TIỆN ÍCH → click "Tra cứu HĐ bảo hiểm" → /Profit/CASearchObjects', async ({ page }) => {
  test.setTimeout(120000);

  await navigateViaMenu(page, 'Tiện ích', 'Tra cứu HĐ bảo hiểm');

  await expect(page).toHaveURL(/\/Profit\/CASearchObjects/, { timeout: 60000 });
  // Lưu ý (quan sát probe): menu ghi "Tra cứu HĐ bảo hiểm" nhưng trang đích có tiêu đề
  // "Tìm Thông tin người được bảo hiểm" — đây là tên trang thật của app, kỳ vọng theo app.
  await expect(page).toHaveTitle(/Tìm Thông tin người được bảo hiểm.*PJICO/i, { timeout: 30000 });
  await assertNotServerError(page);

  // Nội dung trang đích hiển thị thật: form tra cứu người được bảo hiểm + nút "Tìm kiếm"
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText).toMatch(/Tìm thông tin người được bảo hiểm/i);
  expect(bodyText).toMatch(/Số CMT\/Thẻ CCCD/i);
  await expect(page.getByRole('button', { name: /tìm kiếm/i }).first()).toBeVisible({ timeout: 30000 });
});