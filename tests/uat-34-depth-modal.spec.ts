import { test, expect } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU 05 — Modal "Xem chi tiết các tháng" trên Dashboard (/Home/Index)
 * App UAT PJICO: https://uat-capdon.pjico.com.vn
 *
 * Hành vi (đã probe bằng probe-depth-05-dashboard-modal.js):
 *   - Nút mở modal: <button class="btn btn-filter-update"> "Xem chi tiết các tháng" (id="button")
 *   - Modal: #modal_MonthlyRevenue, ẩn sẵn trong DOM (class "modal fade"),
 *     sau khi mở có class "modal fade in" + style display:block + backdrop ".modal-backdrop".
 *   - Tiêu đề modal: <h4 class="modal-title"><span id="dtpsthang_ct">Chi tiết doanh thu theo từng tháng</span></h4>
 *   - Nội dung: bảng #table-dt1 (cột "Đơn vị", "Tháng 1".."Tháng 12")
 *   - Nút đóng: button.close (×) với data-dismiss="modal" — đóng thành công.
 *   - Phím Escape KHÔNG đóng modal (kể cả khi focus nằm trong modal) — hành vi
 *     không như mong đợi của modal bootstrap chuẩn → test 4 viết kỳ vọng ĐÚNG
 *     (modal phải đóng) và được ghi nhận là finding.
 *
 * AN TOÀN: chỉ-đọc. KHÔNG bấm "Chấp nhận" (btn-danger) hay "Hủy" — chỉ dùng nút .close / Escape.
 */

test.use({ viewport: { width: 1600, height: 900 } });

const openModalButton = page => page.locator('button.btn-filter-update')
  .filter({ hasText: /xem chi tiết các tháng/i });
const modal = page => page.locator('#modal_MonthlyRevenue');

test('dashboard: nút "Xem chi tiết các tháng" mở #modal_MonthlyRevenue với tiêu đề đúng', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { waitUntil: 'load', timeout: 90000 });
  // Session hết hạn thì sẽ về trang login → dừng với thông báo rõ ràng
  await expect(page.locator('#EMAIL')).toHaveCount(0);

  // Trước khi mở: modal đã tồn tại trong DOM nhưng ẩn
  const m = modal(page);
  await expect(m).toHaveCount(1);
  await expect(m).toBeHidden();

  // Bấm nút mở modal (click trực tiếp, KHÔNG force — nút hiển thị bình thường)
  await openModalButton(page).click({ timeout: 30000 });

  // Modal hiển thị: class bootstrap "in" + display block
  await expect(m).toBeVisible({ timeout: 15000 });
  await expect(m).toHaveClass(/in/);
  expect(await m.evaluate(el => getComputedStyle(el).display)).toBe('block');

  // Tiêu đề modal hiển thị thực sự (không chỉ nằm trong DOM)
  const heading = m.locator('h4.modal-title');
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText(/chi tiết doanh thu theo từng tháng/i);
  await expect(m.locator('#dtpsthang_ct')).toHaveText(/chi tiết doanh thu theo từng tháng/i);

  // Backdrop bootstrap xuất hiện khi modal mở
  await expect(page.locator('.modal-backdrop')).toHaveCount(1);

  await page.screenshot({ path: 'test-results/depth05-modal-open.png' });
});

test('dashboard: modal hiển thị bảng doanh thu 12 tháng với cột "Đơn vụ/Tháng"', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { waitUntil: 'load', timeout: 90000 });
  await expect(page.locator('#EMAIL')).toHaveCount(0);

  const m = modal(page);
  await openModalButton(page).click({ timeout: 30000 });
  await expect(m).toBeVisible({ timeout: 15000 });

  // Bảng chi tiết nằm trong modal
  const table = m.locator('#table-dt1');
  await expect(table).toBeVisible();
  await expect(table.locator('thead td').first()).toHaveText(/đơn vị/i);
  for (const month of [1, 6, 12]) {
    await expect(table.locator('thead td', { hasText: new RegExp(`^Tháng ${month}$`, 'i') })).toBeVisible();
  }
  // Bảng có ít nhất 1 dòng dữ liệu đơn vị
  await expect(table.locator('tbody tr td:first-child').first()).not.toHaveText('');

  // Nút đóng .close (×) hiển thị trong modal — không có nút Lưu/Chấp nhận nào khác
  await expect(m.locator('.close')).toBeVisible();
  await expect(m.locator('button')).toHaveCount(1); // chỉ duy nhất nút ×
  await expect(m.locator('.btn-danger, .btn-primary')).toHaveCount(0);

  // Đóng bằng nút .close (×) — KHÔNG bấm Hủy/Chấp nhận
  await m.locator('.close').click({ timeout: 30000 });
  await expect(m).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/depth05-modal-closed.png' });
});

test('dashboard: mở lại modal sau khi đóng bằng .close vẫn hoạt động', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { waitUntil: 'load', timeout: 90000 });
  await expect(page.locator('#EMAIL')).toHaveCount(0);

  const m = modal(page);

  // Vòng 1: mở → đóng
  await openModalButton(page).click({ timeout: 30000 });
  await expect(m).toBeVisible({ timeout: 15000 });
  await m.locator('.close').click({ timeout: 30000 });
  await expect(m).toBeHidden({ timeout: 15000 });

  // Vòng 2: mở lại
  await openModalButton(page).click({ timeout: 30000 });
  await expect(m).toBeVisible({ timeout: 15000 });
  await expect(m.locator('h4.modal-title')).toHaveText(/chi tiết doanh thu theo từng tháng/i);

  // Đóng lại cho sạch trạng thái
  await m.locator('.close').click({ timeout: 30000 });
  await expect(m).toBeHidden({ timeout: 15000 });
});

test('dashboard: phím Escape phải đóng modal "Xem chi tiết các tháng" (kỳ vọng chuẩn bootstrap)', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { waitUntil: 'load', timeout: 90000 });
  await expect(page.locator('#EMAIL')).toHaveCount(0);

  const m = modal(page);
  await openModalButton(page).click({ timeout: 30000 });
  await expect(m).toBeVisible({ timeout: 15000 });

  // Đưa focus vào trong modal rồi bấm Escape
  await m.locator('h4.modal-title').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);

  // Kỳ vọng ĐÚNG của modal bootstrap (data-dismiss, keyboard mặc định): Escape phải đóng modal.
  // Probe cho thấy app KHÔNG đóng — test này FAIL và được ghi nhận là finding.
  await expect(m).toBeHidden({ timeout: 10000 });

  // Nếu modal không đóng, dọn trạng thái bằng nút .close để không ảnh hưởng test khác
  if (await m.isVisible()) {
    await m.locator('.close').click({ timeout: 30000 });
    await expect(m).toBeHidden({ timeout: 15000 });
  }
});