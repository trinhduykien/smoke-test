import { test, expect } from '@playwright/test';

/**
 * SMOKE TEST — Phân hệ BÁO CÁO trên UAT: https://uat-capdon.pjico.com.vn
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session dùng sẵn .auth/uat.json)
 *
 * Phạm vi (17 trang, chỉ đọc — KHÔNG bấm nút Lưu/Thêm/Xóa/Xác nhận):
 *   - Báo cáo doanh thu chăm sóc sức khỏe   /Report/HealthReport
 *   - Báo cáo doanh thu chi tiết             /Report/DetailedRevenueReport?bc=dtct
 *   - Báo cáo xe cần tái tục / đã tái tục    /Report/RenewalReport?bc=cantt | ?bc=datt
 *   - Báo cáo doanh thu theo chương trình    /Report/BancasReport?bc=1..5
 *   - Danh sách đã/chưa nhận về từ Premia   /Report/SynthesisCertificateReport[_receive]
 *   - Báo cáo tái tục Tài sản - Hỗn hợp     /Report/StaffReport?bc=tshh | ?bc=tshhct
 *   - Báo cáo doanh thu chi tiết hàng hóa    /ContractCargo/SearchBCTLO
 *   - Dashboard                              /AppDashboard/DashBoard
 *   - Báo cáo chương trình tích điểm         /Report/PointReport?bc=ct | ?bc=thdv
 *
 * Mỗi test: goto → HTTP 200 → không phải trang lỗi server (Server Error/Runtime
 * Error/Exception) → heading chính của báo cáo hiển thị + ô "Từ ngày" (#ngayd)
 * hiển thị (phần tử ổn định, render phía server, không phụ thuộc AJAX).
 */

/** Heading chính của trang (h1-h4/.page-title, match chứa chuỗi) phải hiện. */
async function expectHeading(page: import('@playwright/test').Page, text: string) {
  // Tiêu đề trang trong app là <a class="titleContract"> (xác nhận qua probe DOM),
  // chọn rộng thêm h1-h4/.page-title/[class*=title] cho bền vững.
  const heading = page
    .locator('h1, h2, h3, h4, .page-title, .titleContract, [class*="title"]')
    .filter({ hasText: text })
    .first();
  await expect(heading).toBeVisible({ timeout: 30000 });
}

/** Body không chứa text lỗi server crash. */
async function expectNoServerError(page: import('@playwright/test').Page) {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toMatch(/Server Error|Runtime Error|Exception/i);
}

test('[BÁO CÁO] Báo cáo doanh thu chăm sóc sức khỏe tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/HealthReport', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo doanh thu bảo hiểm chăm sóc sức khỏe');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo doanh thu chi tiết (bc=dtct) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/DetailedRevenueReport?bc=dtct', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo doanh thu chi tiết');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo xe cần tái tục (bc=cantt) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/RenewalReport?bc=cantt', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chi tiết xe cần/ đã tái tục');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo xe đã tái tục (bc=datt) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/RenewalReport?bc=datt', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo tỷ lệ tái tục XCG');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo doanh thu theo chương trình (bc=1) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/BancasReport?bc=1', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chi tiết doanh thu theo chương trình');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo doanh thu theo chương trình (bc=2) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/BancasReport?bc=2', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chi tiết doanh thu theo chương trình');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo doanh thu theo chương trình (bc=3) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/BancasReport?bc=3', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chi tiết doanh thu theo chương trình');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo công nợ theo dòng xe (bc=4) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/BancasReport?bc=4', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo công nợ theo dòng xe');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo doanh thu theo chương trình (bc=5) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/BancasReport?bc=5', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chi tiết doanh thu theo chương trình');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Danh sách đã nhận về từ Premia tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/SynthesisCertificateReport_receive', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Danh sách đã nhận về từ Premia theo đơn vị');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Danh sách chưa nhận về từ Premia tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/SynthesisCertificateReport', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Danh sách chưa nhận về từ Premia theo đơn vị');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo tỷ lệ tái tục Tài sản - Hỗn hợp (bc=tshh) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/StaffReport?bc=tshh', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo tỷ lệ tái tục Tài sản - Hỗn hợp');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo tái tục chi tiết Tài sản - Hỗn hợp (bc=tshhct) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/StaffReport?bc=tshhct', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo tái tục chi tiết Tài sản - Hỗn hợp');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo doanh thu chi tiết hàng hóa (SearchBCTLO) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/ContractCargo/SearchBCTLO', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo doanh thu chi tiết');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
  // Grid dữ liệu shipment hiển thị cột đặc trưng của báo cáo TLO
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).toContain('Nghiệp vụ');
});

test('[BÁO CÁO] Dashboard (AppDashboard) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/AppDashboard/DashBoard', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);

  // Kỳ vọng đúng: KHÔNG bị đẩy sang trang lỗi và KHÔNG hiển thị "Trang thông báo lỗi".
  // (Probe thực tế 2026-09-03: URL cuối là /ErrorHandler/Index — test này FAIL phản ánh lỗi thật của app.)
  expect(page.url()).not.toMatch(/ErrorHandler|Error/i);
  await expectNoServerError(page);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toBe('Trang thông báo lỗi');
});

test('[BÁO CÁO] Báo cáo chương trình tích điểm (bc=ct) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/PointReport?bc=ct', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chương trình tích điểm');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});

test('[BÁO CÁO] Báo cáo chương trình tích điểm đại lý (bc=thdv) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);

  const resp = await page.goto('/Report/PointReport?bc=thdv', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBe(200);
  await expectNoServerError(page);

  await expectHeading(page, 'Báo cáo chương trình tích điểm');
  await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
});