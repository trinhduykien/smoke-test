import { test, expect, type Page } from '@playwright/test';

/**
 * DEPTH TEST (vòng chiều sâu) — Khu vực menu "HỆ THỐNG MÃ" / "BÁO CÁO" — UAT PJICO
 * App: https://uat-capdon.pjico.com.vn (Nền tảng cấp đơn bảo hiểm PJICO)
 * Session đã đăng nhập lưu sẵn trong .auth/uat.json (storageState mặc định của config).
 *
 * KIẾN THỨC TỪ PROBE THẬT (probe-depth-09b/c/d.js):
 *   - "HỆ THỐNG MÃ" và "BÁO CÁO" KHÔNG phải submenu lồng trong panel TIỆN ÍCH,
 *     mà là CÁC MENU TOP-LEVEL RIÊNG (li.pj-top-item.pj-top-item--split trong cùng
 *     ul top của #navbar-collapse-x). Trong panel TIỆN ÍCH không có toggle con nào.
 *   - Ở viewport 1600x900 cả 7 menu top đều hiển thị (menu "THÊM" overflow không hiện).
 *   - Panel dropdown của mỗi menu top: .pj-menu-panel trong cùng .pj-top-item;
 *     khi mở, panel có thêm class "pj-panel--anchored".
 *   - Menu chính mở bằng HOVER (KHÔNG click toggle — click lần 2 sẽ ĐÓNG panel).
 *   - Di chuột từ menu này sang menu khác: panel cũ tự đóng, panel mới mở (không
 *     cần di chuột về vùng trống trước).
 *   - Panel HỆ THỐNG MÃ hiện các mục được phân quyền: "Mã đơn vị", "Mã phòng ban/bộ phận",
 *     "Mã người sử dụng", "Mã cán bộ", "Quản lý icon menu". Mục "Mã khách hàng"
 *     (href /CategoryInsurance/Customer) CÒN trong DOM nhưng bị ẨN — tài khoản test
 *     không có quyền (menu lọc theo quyền phía server). Tương tự panel BÁO CÁO:
 *     "Báo cáo doanh thu bảo hiểm CSSK (6901/6903)", "Báo cáo tổng hợp khai thác TLO",
 *     "APP - Dashboard tổng hợp" hiển thị; "DT theo đối tượng quản lý" bị ẩn (không quyền).
 *   - Click leaf trong panel điều hướng tới trang tương ứng:
 *     "Mã đơn vị" → /CategorySystem/Unit, "Báo cáo doanh thu bảo hiểm CSSK (6901/6903)" → /Report/HealthReport.
 *
 * AN TOÀN — CHỈ ĐỌC: chỉ hover/click điều hướng menu, KHÔNG bấm Lưu/Thêm/Xóa/Xác nhận/Đăng xuất.
 */

// Menu top cần độ rộng đủ để "HỆ THỐNG MÃ"/"BÁO CÁO" không bị gộp vào "THÊM" — dùng 1600x900 như probe
test.use({ viewport: { width: 1600, height: 900 } });

const HOME = '/Home/Index';

// Toggle menu top theo text (DOM hiện in hoa "HỆ THỐNG MÃ" do CSS; hasText khớp không phân biệt hoa/thường)
function topMenuToggle(page: Page, menuName: string) {
  return page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: new RegExp('^\\s*' + menuName + '\\s*$', 'i') })
    .first();
}

// Panel dropdown nằm trong cùng .pj-top-item với toggle
function topMenuPanel(page: Page, menuName: string) {
  return topMenuToggle(page, menuName)
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
}

/* ============ 1. CẤU TRÚC: "Hệ thống mã"/"Báo cáo" là menu top-level riêng ============ */

test('[SUBMENU HỆ THỐNG MÃ/BÁO CÁO] "Hệ thống mã" và "Báo cáo" là menu top-level hiển thị đầy ở 1600px', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);

  // Cả 3 toggle TIỆN ÍCH / HỆ THỐNG MÃ / BÁO CÁO đều hiển thị trên thanh menu top
  await expect(topMenuToggle(page, 'Tiện ích')).toBeVisible({ timeout: 30000 });
  await expect(topMenuToggle(page, 'Hệ thống mã')).toBeVisible({ timeout: 30000 });
  await expect(topMenuToggle(page, 'Báo cáo')).toBeVisible({ timeout: 30000 });

  // Mỗi toggle nằm trong .pj-top-item RIÊNG (không lồng trong panel TIỆN ÍCH)
  const htmTopItem = topMenuToggle(page, 'Hệ thống mã')
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]');
  await expect(htmTopItem).toHaveClass(/pj-top-item--split/, { timeout: 30000 });
  await expect(topMenuToggle(page, 'Báo cáo')
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')).toHaveClass(/pj-top-item--split/, { timeout: 30000 });

  // Panel TIỆN ÍCH KHÔNG chứa toggle con "Hệ thống mã"/"Báo cáo" (quan sát probe — không có submenu lồng)
  await topMenuToggle(page, 'Tiện ích').hover();
  const tienIchPanel = topMenuPanel(page, 'Tiện ích');
  await expect(tienIchPanel).toBeVisible({ timeout: 30000 });
  await expect(
    tienIchPanel.locator('.dropdown-toggle').filter({ hasText: /hệ thống mã|báo cáo/i })
  ).toHaveCount(0);
});

/* ============ 2. HOVER CHUYỂN TIẾP GIỮA CÁC PANEL ============ */

test('[SUBMENU HỆ THỐNG MÃ/BÁO CÁO] Hover chuyển tiếp: panel TIỆN ÍCH đóng, panel HỆ THỐNG MÃ mở', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Tiện ích')).toBeVisible({ timeout: 30000 });

  // Hover TIỆN ÍCH → panel mở và có class "pj-panel--anchored" (trạng thái mở theo probe)
  await topMenuToggle(page, 'Tiện ích').hover();
  const tienIchPanel = topMenuPanel(page, 'Tiện ích');
  await expect(tienIchPanel).toBeVisible({ timeout: 30000 });
  await expect(tienIchPanel).toHaveClass(/pj-panel--anchored/, { timeout: 30000 });

  // Hover tiếp "Hệ thống mã" (menu top kề bên) → panel TIỆN ÍCH tự đóng, panel HỆ THỐNG MÃ mở
  await topMenuToggle(page, 'Hệ thống mã').hover();
  const htmPanel = topMenuPanel(page, 'Hệ thống mã');
  await expect(htmPanel).toBeVisible({ timeout: 30000 });
  await expect(tienIchPanel).toBeHidden({ timeout: 30000 });
  await expect(htmPanel).toHaveClass(/pj-panel--anchored/, { timeout: 30000 });
});

/* ============ 3. PANEL HỆ THỐNG MÃ — MỤC ĐƯỢC PHÂN QUYỀN HIỂN THỊ ============ */

test('[SUBMENU HỆ THỐNG MÃ/BÁO CÁO] Panel HỆ THỐNG MÃ hiện "Mã đơn vị", "Mã người sử dụng", "Mã cán bộ"', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Hệ thống mã')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Hệ thống mã').hover();
  const htmPanel = topMenuPanel(page, 'Hệ thống mã');
  await expect(htmPanel).toBeVisible({ timeout: 30000 });

  // Các mục danh mục được phân quyền hiển thị trong panel
  await expect(htmPanel.getByText('Mã đơn vị', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await expect(htmPanel.getByText('Mã phòng ban/bộ phận', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await expect(htmPanel.getByText('Mã người sử dụng', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await expect(htmPanel.getByText('Mã cán bộ', { exact: true }).first()).toBeVisible({ timeout: 30000 });

  // Link "Mã đơn vị" trỏ đúng trang danh mục đơn vị
  await expect(htmPanel.locator('a[href="/CategorySystem/Unit"]').first()).toBeVisible({ timeout: 30000 });

  // Mục KHÔNG được phân quyền ("Mã khách hàng") còn trong DOM nhưng bị ẩn — menu lọc theo quyền
  const maKhachHang = htmPanel.getByText('Mã khách hàng', { exact: true }).first();
  await expect(maKhachHang).toBeAttached({ timeout: 30000 });
  await expect(maKhachHang).toBeHidden();
});

/* ============ 4. CLICK LEAF "MÃ ĐƠN VỊ" → ĐIỀU HƯỚNG ============ */

test('[SUBMENU HỆ THỐNG MÃ/BÁO CÁO] Click "Mã đơn vị" trong panel điều hướng tới /CategorySystem/Unit', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Hệ thống mã')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Hệ thống mã').hover();
  const htmPanel = topMenuPanel(page, 'Hệ thống mã');
  await expect(htmPanel).toBeVisible({ timeout: 30000 });

  // Bấm mục leaf (điều hướng GET — chỉ đọc, không thao tác dữ liệu)
  await htmPanel.getByText('Mã đơn vị', { exact: true }).first().click();

  // Điều hướng về trang danh mục đơn vị
  await expect(page).toHaveURL(/\/CategorySystem\/Unit/, { timeout: 60000 });
  await expect(page).toHaveTitle(/Search - PJICO/i, { timeout: 60000 });
  const bodyText = await page.locator('body').innerText({ timeout: 30000 });
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);
});

/* ============ 5. PANEL BÁO CÁO — MỤC ĐƯỢC PHÂN QUYỀN HIỂN THỊ ============ */

test('[SUBMENU HỆ THỐNG MÃ/BÁO CÁO] Panel BÁO CÁO hiện các mục báo cáo được phân quyền', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Báo cáo')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Báo cáo').hover();
  const bcPanel = topMenuPanel(page, 'Báo cáo');
  await expect(bcPanel).toBeVisible({ timeout: 30000 });

  // Các mục báo cáo được phân quyền hiển thị trong panel
  await expect(
    bcPanel.getByText('Báo cáo doanh thu bảo hiểm CSSK (6901/6903)', { exact: true }).first()
  ).toBeVisible({ timeout: 30000 });
  await expect(
    bcPanel.getByText('Báo cáo tổng hợp khai thác TLO', { exact: true }).first()
  ).toBeVisible({ timeout: 30000 });
  await expect(
    bcPanel.getByText('APP - Dashboard tổng hợp', { exact: true }).first()
  ).toBeVisible({ timeout: 30000 });

  // Mục "DT theo đối tượng quản lý" KHÔNG được phân quyền cho tài khoản test — ẩn trong panel
  const dtDtqly = bcPanel.getByText('DT theo đối tượng quản lý', { exact: true }).first();
  await expect(dtDtqly).toBeAttached({ timeout: 30000 });
  await expect(dtDtqly).toBeHidden();
});

/* ============ 6. CLICK LEAF BÁO CÁO → ĐIỀU HƯỚNG + MENU VẪN DÙNG ĐƯỢC ============ */

test('[SUBMENU HỆ THỐNG MÃ/BÁO CÁO] Click "Báo cáo doanh thu bảo hiểm CSSK (6901/6903)" điều hướng /Report/HealthReport', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await expect(topMenuToggle(page, 'Báo cáo')).toBeVisible({ timeout: 30000 });

  await topMenuToggle(page, 'Báo cáo').hover();
  const bcPanel = topMenuPanel(page, 'Báo cáo');
  await expect(bcPanel).toBeVisible({ timeout: 30000 });

  // Bấm mục leaf (trang báo cáo chỉ đọc)
  await bcPanel.getByText('Báo cáo doanh thu bảo hiểm CSSK (6901/6903)', { exact: true }).first().click();

  // Điều hướng tới trang báo cáo doanh thu CSSK
  await expect(page).toHaveURL(/\/Report\/HealthReport/, { timeout: 60000 });
  await expect(page).toHaveTitle(/Ban bảo hiểm sức khỏe/i, { timeout: 60000 });

  // Sau khi điều hướng, menu top vẫn hoạt động: hover BÁO CÁO mở lại panel
  await expect(topMenuToggle(page, 'Báo cáo')).toBeVisible({ timeout: 30000 });
  await topMenuToggle(page, 'Báo cáo').hover();
  await expect(bcPanel).toBeVisible({ timeout: 30000 });
  // Và hover sang "Hệ thống mã" từ trang báo cáo vẫn mở đúng panel
  await topMenuToggle(page, 'Hệ thống mã').hover();
  await expect(topMenuPanel(page, 'Hệ thống mã')).toBeVisible({ timeout: 30000 });
  await expect(bcPanel).toBeHidden({ timeout: 30000 });
});