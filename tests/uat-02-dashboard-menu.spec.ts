import { test, expect, type Page } from '@playwright/test';

/**
 * SMOKE TEST — Phân hệ "DASHBOARD & MENU & TÀI KHOẢN"
 * App UAT cấp đơn bảo hiểm PJICO: https://uat-capdon.pjico.com.vn
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session lưu sẵn .auth/uat.json)
 *
 * Phạm vi (3 trang + các test tương tác menu, CHỈ ĐỌC — KHÔNG bấm nút Lưu/Thêm/Xóa/Đăng xuất):
 *   1. /Home/Index              — Dashboard (doanh thu theo tháng, menu top bar)
 *   2. /Qrcode/SearchQrcode     — Danh sách QRCODE
 *   3. /Tienich/ChangePassword  — Đổi mật khẩu (chỉ kiểm tra hiển thị, KHÔNG đổi)
 *
 * Tương tác menu (quan sát bằng probe thật — probe-menu-user*.js):
 *   - Menu chính: hover ".dropdown-toggle.name-menu--item" (text DOM là "Cấp đơn",
 *     hiển thị in hoa bằng CSS) → panel ".pj-menu-panel" trong cùng ".pj-top-item" hiện ra.
 *     KHÔNG click toggle vì click lần 2 sẽ ĐÓNG panel.
 *   - "Tìm nhanh chức năng": #pjMenuSearchToggle → #pjMenuSearchInput hiện ra.
 *   - User menu: #pjUserMenuToggle → ".profile-menu" hiện "Tạo QR cấp đơn",
 *     "Đổi mật khẩu", "Đăng xuất" (KHÔNG bấm vào các mục này).
 */

// Menu top cần độ rộng đủ để không item nào bị gộp vào "THÊM" (overflow) — probe dùng 1600px
test.use({ viewport: { width: 1600, height: 900 } });

const HOME = '/Home/Index';

async function assertNotServerError(page: Page) {
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText, 'Trang không được hiển thị nội dung lỗi server').not.toMatch(/Server Error|Runtime Error|Exception/i);
}

// Lấy toggle của một menu cha theo text (không phân biệt hoa/thường vì CSS in hoa)
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

/* ============================ 1. TẢI 3 TRANG ============================ */

test('[DASHBOARD & MENU & TÀI KHOẢN] Dashboard (Home/Index) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);

  // Tiêu đề trang dashboard
  await expect(page).toHaveTitle(/Dashboard.*PJICO/i, { timeout: 30000 });

  // Menu top bar hiển thị (mục "CẤP ĐƠN" — text DOM "Cấp đơn", CSS in hoa)
  await expect(topMenuToggle(page, 'Cấp đơn')).toBeVisible({ timeout: 30000 });
  await expect(topMenuToggle(page, 'Tiện ích')).toBeVisible({ timeout: 30000 });

  // Khối doanh thu theo tháng: biểu đồ Highcharts + bộ lọc "Kiểu số liệu" (hiển thị thật theo probe)
  await expect(page.locator('#bar-chart-dt')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#kieu_sl')).toBeVisible({ timeout: 30000 });
  // Nút mở modal "Chi tiết doanh thu theo từng tháng" (heading đó nằm trong modal ẩn #modal_MonthlyRevenue)
  await expect(page.getByRole('button', { name: 'Xem chi tiết các tháng' })).toBeVisible({ timeout: 30000 });
});

test('[DASHBOARD & MENU & TÀI KHOẢN] Danh sách QRCODE (SearchQrcode) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto('/Qrcode/SearchQrcode', { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);

  await expect(page).toHaveTitle(/Danh sách QRCODE/i, { timeout: 30000 });

  // Nút chính của trang — chỉ kiểm tra hiển thị, KHÔNG bấm "Tạo QRCODE"
  // (heading "Cập nhật danh sách QRCODE" nằm trong modal ẩn nên không dùng làm assert)
  await expect(page.getByRole('button', { name: 'Tạo QRCODE' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Tìm Kiếm' })).toBeVisible({ timeout: 30000 });
});

test('[DASHBOARD & MENU & TÀI KHOẢN] Trang Đổi mật khẩu (ChangePassword) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto('/Tienich/ChangePassword', { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await assertNotServerError(page);

  await expect(page).toHaveTitle(/Đổi mật khẩu/i, { timeout: 30000 });

  // Heading chính + form đổi mật khẩu (chỉ kiểm tra hiển thị — KHÔNG nhập, KHÔNG bấm "Xác nhận thay đổi")
  await expect(
    page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'HỆ THỐNG THAY ĐỔI MẬT KHẨU NGƯỜI DÙNG' }).first()
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#PAS_MOI')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#PAS_MOI_RE')).toBeVisible({ timeout: 30000 });
});

/* ===================== 2. MENU CHÍNH — HOVER MỞ DROPDOWN ===================== */

// Menu "CẤP ĐƠN": hover → panel hiện mục con "Cấp đơn xe ô tô"
test('[DASHBOARD & MENU & TÀI KHOẢN] Menu CẤP ĐƠN mở dropdown hiện mục "Cấp đơn xe ô tô"', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Cấp đơn')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Cấp đơn').hover();
  await expect(topMenuPanel(page, 'Cấp đơn')).toBeVisible({ timeout: 30000 });
  await expect(
    topMenuPanel(page, 'Cấp đơn').getByText('Cấp đơn xe ô tô', { exact: true })
  ).toBeVisible({ timeout: 30000 });
});

// Menu "THANH TOÁN": hover → panel hiện mục con "Thanh toán phí"
test('[DASHBOARD & MENU & TÀI KHOẢN] Menu THANH TOÁN mở dropdown hiện mục "Thanh toán phí"', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Thanh toán')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Thanh toán').hover();
  await expect(topMenuPanel(page, 'Thanh toán')).toBeVisible({ timeout: 30000 });
  await expect(
    topMenuPanel(page, 'Thanh toán').getByText('Thanh toán phí', { exact: true })
  ).toBeVisible({ timeout: 30000 });
});

// Menu "BỒI THƯỜNG": hover → panel hiện mục con "Tim ho so FTS" (nhãn gốc không dấu theo probe)
test('[DASHBOARD & MENU & TÀI KHOẢN] Menu BỒI THƯỜNG mở dropdown hiện mục tra cứu hồ sơ', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Bồi thường')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Bồi thường').hover();
  await expect(topMenuPanel(page, 'Bồi thường')).toBeVisible({ timeout: 30000 });
  await expect(
    topMenuPanel(page, 'Bồi thường').getByText('Tim ho so FTS', { exact: true })
  ).toBeVisible({ timeout: 30000 });
});

// Menu "TÁI BẢO HIỂM": hover → panel hiện mục con "Hợp đồng nhận tái cố định"
test('[DASHBOARD & MENU & TÀI KHOẢN] Menu TÁI BẢO HIỂM mở dropdown hiện mục "Hợp đồng nhận tái cố định"', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Tái bảo hiểm')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Tái bảo hiểm').hover();
  await expect(topMenuPanel(page, 'Tái bảo hiểm')).toBeVisible({ timeout: 30000 });
  await expect(
    topMenuPanel(page, 'Tái bảo hiểm').getByText('Hợp đồng nhận tái cố định', { exact: true })
  ).toBeVisible({ timeout: 30000 });
});

// Menu "TIỆN ÍCH": hover → panel hiện mục con "Duyệt hợp đồng"
test('[DASHBOARD & MENU & TÀI KHOẢN] Menu TIỆN ÍCH mở dropdown hiện mục "Duyệt hợp đồng"', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Tiện ích')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Tiện ích').hover();
  await expect(topMenuPanel(page, 'Tiện ích')).toBeVisible({ timeout: 30000 });
  await expect(
    topMenuPanel(page, 'Tiện ích').getByText('Duyệt hợp đồng', { exact: true })
  ).toBeVisible({ timeout: 30000 });
});

/* ================= 3. TÌM NHANH CHỨC NĂNG (#pjMenuSearchToggle) ================= */

test('[DASHBOARD & MENU & TÀI KHOẢN] Nút "Tìm nhanh chức năng" mở hộp tìm kiếm', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  // Chờ app JS gắn handler cho toggle (click quá sớm ngay sau domcontentloaded
  // có thể bị nuốt vì handler chưa kịp bind — quan sát thấy ở probe).
  await page.waitForLoadState('load');

  // Trước khi bấm: ô tìm kiếm ẩn (panel #pjMenuSearchPanel)
  await expect(page.locator('#pjMenuSearchToggle')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#pjMenuSearchInput')).toBeHidden();

  // Bấm toggle → hộp tìm kiếm hiện ra (thử lại 1 lần nếu click đầu bị nuốt
  // do handler chưa bind kịp — panel có animation fade nên cần chờ).
  await page.locator('#pjMenuSearchToggle').click();
  try {
    await expect(page.locator('#pjMenuSearchPanel')).toBeVisible({ timeout: 5000 });
  } catch {
    await page.locator('#pjMenuSearchToggle').click();
  }
  await expect(page.locator('#pjMenuSearchPanel')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#pjMenuSearchInput')).toBeVisible({ timeout: 30000 });

  // Gõ thử từ khóa (chỉ đọc — không bấm kết quả)
  await page.locator('#pjMenuSearchInput').fill('cấp đơn');
  await expect(page.locator('#pjMenuSearchInput')).toHaveValue('cấp đơn');
});

/* ======================= 4. USER MENU (#pjUserMenuToggle) ======================= */

test('[DASHBOARD & MENU & TÀI KHOẢN] User menu hiện "Tạo QR cấp đơn", "Đổi mật khẩu", "Đăng xuất"', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });

  // Menu hồ sơ (.profile-menu) ẩn trước khi bấm
  await expect(page.locator('#pjUserMenuToggle')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.list-item--menu .profile-menu')).toBeHidden();

  // Bấm toggle user → menu hiện 3 mục (KHÔNG bấm vào bất kỳ mục nào)
  await page.locator('#pjUserMenuToggle').click();
  const profileMenu = page.locator('.list-item--menu .profile-menu');
  await expect(profileMenu).toBeVisible({ timeout: 30000 });
  await expect(profileMenu.getByText('Tạo QR cấp đơn', { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(profileMenu.getByText('Đổi mật khẩu', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await expect(profileMenu.getByText('Đăng xuất', { exact: true }).first()).toBeVisible({ timeout: 30000 });
});