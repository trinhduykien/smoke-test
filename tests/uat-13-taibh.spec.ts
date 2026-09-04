import { test, expect } from '@playwright/test';

/**
 * SMOKE TEST — Phân hệ TÁI BẢO HIỂM (UAT: https://uat-capdon.pjico.com.vn)
 *
 * Phạm vi: 10 trang của phân hệ Tái bảo hiểm, gồm:
 *   - Hợp đồng nhận tái cố định:      /ReInsurance/InwardTreatyReinsurance
 *   - Hợp đồng nhượng tái cố định:    /ReInsurance/OutwardTreatyReinsurance
 *   - Mức giữ lại theo nghiệp vụ:    /CategoryReInsurance/RetentionByMajor
 *   - Mức giữ lại theo đối tượng:     /CategoryReInsurance/RetentionByObject
 *   - Mức giữ lại theo ĐT (XCG/PNI): /CategoryReInsurance/RetentionByObjectCar
 *   - Tìm phân bổ tái:                /ReInsurance/AllocationSearch
 *   - Tìm xử lý tái:                  /ReInsurance/ProcessingSearch
 *   - Đối chiếu nhượng tái:           /ReInsurance/TreatyOutwardSearch
 *   - Bảng kê đối chiếu nhận tái:     /ReInsurance/TreatyInward
 *   - Chứng từ công nợ nhà tái:       /ReInsurance/Debt
 *
 * Mỗi test chỉ ĐỌC: mở trang, kiểm tra HTTP status, kiểm tra không phải
 * trang lỗi server, và assert các phần tử ổn định (tiêu đề trang, heading,
 * ô tìm kiếm, bảng) đã render. KHÔNG bấm nút tạo/sửa/xóa/lưu dữ liệu.
 *
 * Session đăng nhập dùng sẵn .auth/uat.json (playwright.config.ts).
 */

/** Kiểm tra body không chứa dấu hiệu lỗi server / crash của app ASP.NET. */
async function expectNotServerError(page: import('@playwright/test').Page) {
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(
    bodyText,
    `Trang "${page.url()}" không được chứa dấu hiệu lỗi server`
  ).not.toMatch(/Server Error|Runtime Error|Exception/i);
}

test.describe('[TÁI BẢO HIỂM] Smoke test 10 trang phân hệ tái bảo hiểm', () => {

  test('[TÁI BẢO HIỂM] Hợp đồng nhận tái cố định tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/InwardTreatyReinsurance', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    // Phần tử ổn định: tiêu đề trang, heading, ô tìm kiếm Số HD
    await expect(page).toHaveTitle(/Tìm hợp đồng nhận tái cố định/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Hợp đồng nhận tái cố định' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#tim_ngayd')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Hợp đồng nhượng tái cố định tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/OutwardTreatyReinsurance', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Tìm hợp đồng nhượng tái cố định/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Hợp đồng nhượng tái cố định' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#tim_ngayd')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Mức giữ lại theo nghiệp vụ tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/CategoryReInsurance/RetentionByMajor', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Mức giữ lại theo nghiệp vụ/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Mức giữ lại theo nghiệp vụ' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#NGAY')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#MA_NT')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Mức giữ lại theo đối tượng tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/CategoryReInsurance/RetentionByObject', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Mức giữ lại theo đối tượng - PJICO/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Mức giữ lại theo đối tượng' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('select#NV')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#NGAY')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Mức giữ lại theo đối tượng XCG/PNI tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/CategoryReInsurance/RetentionByObjectCar', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Mức giữ lại theo đối tượng - Dành cho XCG và PNI/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Mức giữ lại theo đối tượng khác' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('select#NV')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Tìm phân bổ tái tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/AllocationSearch', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Phân bổ tái/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Tìm phân bổ tái' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#so_hd')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Tìm xử lý tái tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/ProcessingSearch', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Xử lý tái/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Tìm xử lý tái' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#ngayd')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#so_hd')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Tìm đối chiếu nhượng tái bảo hiểm tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/TreatyOutwardSearch', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Tìm đối chiếu nhượng tái bảo hiểm/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Tìm đối chiếu nhượng tái bảo hiểm' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#ngay_d')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#so_hd')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Bảng kê đối chiếu nhận tái tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/TreatyInward', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Bảng kê đối chiếu nhận tái/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Bảng kê đối chiếu nhận tái' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#tim_nha_bh')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#tim_so_bk')).toBeVisible({ timeout: 30000 });
  });

  test('[TÁI BẢO HIỂM] Chứng từ công nợ nhà tái tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto('/ReInsurance/Debt', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBeLessThan(400);
    await expectNotServerError(page);
    await expect(page).toHaveTitle(/Chứng từ công nợ nhà tái/i);
    await expect(
      page.locator('h1, h2, h3, h4, .page-title, [class*=title]')
        .filter({ hasText: 'Chứng từ công nợ nhà tái' }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#tim_so_ct')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('#tim_ngayd')).toBeVisible({ timeout: 30000 });
  });

});