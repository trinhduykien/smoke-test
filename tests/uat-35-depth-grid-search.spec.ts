import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU 06 — GRID + DỮ LIỆU SAU KHI BẤM "TÌM KIẾM" — UAT PJICO
 * App: https://uat-capdon.pjico.com.vn (Nền tảng cấp đơn bảo hiểm PJICO)
 *
 * 3 trang được chọn (kết quả probe probe-depth-06-grid-search.js):
 *   1. /ContractCar/Search    — nút "Tìm kiếm" là <button class="btn btn-blue">,
 *                                bấm → POST /ContractPublic/SearchResult (query đọc,
 *                                an toàn) → grid hiển thị "Không có dữ liệu" (tài
 *                                khoản test không có hợp đồng) + pagination hiện "‹ ›".
 *   2. /ClaimGeneral/Search   — nút search thật là "Tìm hồ sơ" (button.btn-square),
 *                                KHÔNG phải "Tìm kiếm nâng cao" (nút đó chỉ là toggle,
 *                                không firing request). Bấm → POST /ClaimGeneral/ListSearch
 *                                → grid "Không có dữ liệu", pagination ẩn.
 *   3. /CategorySystem/Unit   — KHÔNG có nút Tìm kiếm; bảng grid sẵn 10 dòng
 *                                "Mã đơn vị" + phân trang "‹ 1 2 3 4 5 6 7 ›".
 *                                Ô filter input.search-input lọc client-side:
 *                                từ khóa không khớp → "Không có dữ liệu", xóa → đủ 10 dòng.
 *
 * Kỳ vọng grid sau khi bấm Tìm kiếm (môi trường UAT, dữ liệu có thể thay đổi):
 *   - bảng grid chính hiển thị, tbody có ít nhất 1 dòng,
 *   - HOẶC dòng thông báo "Không có dữ liệu" xuất hiện trong grid,
 *   - nếu số dòng dữ liệu vượt page-size (10) → control phân trang phải hiển thị.
 *
 * CHỈ ĐỌC: chỉ goto, bấm nút Tìm kiếm/Tìm hồ sơ, gõ ô filter. KHÔNG bấm
 * Lưu / Thêm mới / Tạo mới / Xóa / Chấp nhận / Hủy / Đăng xuất.
 * Session đã đăng nhập sẵn qua storageState mặc định '.auth/uat.json'.
 */

// Viewport rộng để menu/grid không bị tràn (kiến thức từ vòng smoke trước)
test.use({ viewport: { width: 1600, height: 900 } });

const PAGE_SIZE = 10;

/** Tìm bảng grid chính: bảng đang hiển thị có tiêu đề cột khớp regex. */
async function timGridChinh(page: Page, header: RegExp): Promise<Locator> {
  const grid = page.locator('table:visible').filter({ hasText: header }).first();
  await expect(grid, 'bảng grid chính phải hiển thị').toBeVisible({ timeout: 30000 });
  return grid;
}

/**
 * Assert grid sau khi bấm Tìm kiếm: tbody có ít nhất 1 dòng HOẶC text
 * "Không có dữ liệu" hiển thị trong grid. Nếu có dữ liệu thật vượt page-size
 * thì control phân trang phải tồn tại (hiển thị).
 */
async function assertGridSauTimKiem(page: Page, grid: Locator, nhatKy: string) {
  await expect(grid, `${nhatKy}: grid phải hiển thị`).toBeVisible();

  const soDong = await grid.locator('tbody tr').count();
  expect(soDong, `${nhatKy}: grid phải có tbody tr (dòng dữ liệu hoặc dòng thông báo)`)
    .toBeGreaterThanOrEqual(1);

  const thongBaoKhongCoDuLieu = grid.getByText(/không có dữ liệu/i);
  const soThongBao = await thongBaoKhongCoDuLieu.count();

  if (soThongBao > 0) {
    // Nhánh "Không có dữ liệu" — dòng thông báo phải hiển thị thật trong grid
    await expect(thongBaoKhongCoDuLieu.first(), `${nhatKy}: dòng "Không có dữ liệu" phải hiển thị`)
      .toBeVisible();
    console.log(`${nhatKy}: grid hiển thị "Không có dữ liệu" (không có dòng dữ liệu khớp điều kiện)`);
  } else {
    // Nhánh có dữ liệu thật — mỗi dòng phải có nội dung
    const soDongDuLieu = await grid.locator('tbody tr').filter({ hasText: /.+/ }).count();
    expect(soDongDuLieu, `${nhatKy}: grid có dữ liệu thì phải ít nhất 1 dòng có nội dung`)
      .toBeGreaterThan(0);
    console.log(`${nhatKy}: grid hiển thị ${soDongDuLieu} dòng dữ liệu`);

    // Có dữ liệu vượt page-size → phải có control phân trang
    if (soDongDuLieu > PAGE_SIZE) {
      await expect(page.locator('.pagination').first(), `${nhatKy}: >${PAGE_SIZE} dòng thì phân trang phải hiển thị`)
        .toBeVisible();
      console.log(`${nhatKy}: ${soDongDuLieu} dòng > page-size ${PAGE_SIZE} → phân trang hiển thị`);
    }
  }
}

/** Đảm bảo session còn hiệu lực (không bị đá về trang login). */
async function assertConSession(page: Page, path: string) {
  await expect(page.locator('#EMAIL'), `${path}: không được bị đá về trang login`)
    .toHaveCount(0);
  await expect(page, `${path}: URL không được chứa login`).not.toHaveURL(/login/i);
}

test.describe('Chiều sâu 06 — Grid + dữ liệu sau khi bấm Tìm kiếm — UAT PJICO', () => {

  test('ContractCar/Search: bấm "Tìm kiếm" → grid render dữ liệu hoặc "Không có dữ liệu"', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/ContractCar/Search', { timeout: 90000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertConSession(page, '/ContractCar/Search');

    // Nút "Tìm kiếm" là <button class="btn btn-blue"> (probe: button:has-text('Tìm kiếm') count=1)
    // Probe + snapshot a11y: accessible name là " Tìm kiếm" (có khoảng trắng đầu) →
    // dùng locator CSS class + filter text thay vì getByRole name anchored.
    const btnTimKiem = page.locator('button.btn-blue').filter({ hasText: /tìm kiếm/i }).first();
    await expect(btnTimKiem, 'nút "Tìm kiếm" phải hiển thị').toBeVisible();
    console.log('Selector nút Tìm kiếm: <button class="btn btn-blue"> text="Tìm kiếm"');

    // Bấm Tìm kiếm → app gọi POST /ContractPublic/SearchResult (query đọc, an toàn)
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/ContractPublic/SearchResult'), { timeout: 60000 }),
      btnTimKiem.click(),
    ]);
    expect(resp.status(), 'HTTP status của query tìm kiếm ContractCar').toBeLessThan(400);
    console.log('POST /ContractPublic/SearchResult →', resp.status());

    await page.waitForTimeout(2000); // chờ grid vẽ lại sau khi nhận kết quả

    // Grid chính: bảng visible có cột "SỐ HĐ" (probe: head "NGÀY T.TRẠNG ... SỐ HĐ ...")
    // Grid chính: bảng visible có cột "Số HĐ" (probe: head "NGÀY T.TRẠNG ... SỐ HĐ ..."
    // — innerText bị CSS in hoa, text gốc là "Số HĐ" → regex case-insensitive)
    const grid = await timGridChinh(page, /số h[đd]/i);
    await assertGridSauTimKiem(page, grid, 'ContractCar/Search');

    // Trang vẫn là trang tìm kiếm (không điều hướng đi đâu khác)
    await expect(page).toHaveURL(/ContractCar\/Search/);
  });

  test('ClaimGeneral/Search: bấm "Tìm hồ sơ" → grid render dữ liệu hoặc "Không có dữ liệu"', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/ClaimGeneral/Search', { timeout: 90000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertConSession(page, '/ClaimGeneral/Search');

    // Nút search thật là "Tìm hồ sơ" (probe: button.btn-square.btn-p-input.mr-5).
    // "Tìm kiếm nâng cao" chỉ là toggle mở panel — KHÔNG phải nút submit search.
    const btnTimHoSo = page.getByRole('button', { name: /tìm hồ sơ/i });
    await expect(btnTimHoSo, 'nút "Tìm hồ sơ" phải hiển thị').toBeVisible();
    console.log('Selector nút search: <button class="btn-square btn-p-input mr-5"> text="Tìm hồ sơ"');

    // Bấm → POST /ClaimGeneral/ListSearch (query đọc, an toàn)
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/ClaimGeneral/ListSearch'), { timeout: 60000 }),
      btnTimHoSo.click(),
    ]);
    expect(resp.status(), 'HTTP status của query tìm kiếm ClaimGeneral').toBeLessThan(400);
    console.log('POST /ClaimGeneral/ListSearch →', resp.status());

    await page.waitForTimeout(2000);

    // Grid chính: bảng visible có cột "Số HS" (probe: head "Ngày Số HS Ngày QĐ ..."
    // — text gốc là "Số HS" → regex case-insensitive)
    const grid = await timGridChinh(page, /số hs/i);
    await assertGridSauTimKiem(page, grid, 'ClaimGeneral/Search');

    await expect(page).toHaveURL(/ClaimGeneral\/Search/);
  });

  test('CategorySystem/Unit: grid "Mã đơn vị" có sẵn dữ liệu + phân trang hiển thị (KHÔNG bấm Tạo mới)', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/CategorySystem/Unit', { timeout: 90000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertConSession(page, '/CategorySystem/Unit');

    // Grid chính: bảng visible có cột "Mã đơn vị" (probe: sẵn 10 dòng + head "Mã đơn vị Tên tắt Địa chỉ Tên")
    const grid = await timGridChinh(page, /Mã đơn vị/);
    await expect(grid).toBeVisible();

    const soDong = await grid.locator('tbody tr').filter({ hasText: /.+/ }).count();
    expect(soDong, 'grid Mã đơn vị phải có ít nhất 1 dòng dữ liệu').toBeGreaterThanOrEqual(1);
    console.log(`Grid Mã đơn vị hiển thị ${soDong} dòng (probe: 10 dòng)`);

    // Probe: 10 dòng = page-size, dữ liệu nhiều trang → control phân trang phải hiển thị
    // với nhiều số trang (probe: "‹ 1 2 3 4 5 6 7 ›", 9 page-item)
    const phanTrang = page.locator('.pagination').first();
    await expect(phanTrang, 'phân trang của grid Mã đơn vị phải hiển thị').toBeVisible();
    const soTrangItem = await phanTrang.locator('li, .page-item').count();
    expect(soTrangItem, 'phân trang phải có nhiều hơn 1 mục trang khi dữ liệu vượt page-size')
      .toBeGreaterThan(2);
    const textPhanTrang = (await phanTrang.innerText()).replace(/\s+/g, ' ');
    expect(textPhanTrang, 'phân trang phải chứa số trang').toMatch(/\d/);
    console.log('Phân trang hiển thị:', textPhanTrang);

    // KHÔNG bấm "Tạo mới" hay bất kỳ nút ghi dữ liệu nào — chỉ quan sát grid.
  });

  test('CategorySystem/Unit: filter ô search-input lọc grid client-side — từ khóa không khớp → "Không có dữ liệu"', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/CategorySystem/Unit', { timeout: 90000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertConSession(page, '/CategorySystem/Unit');

    const grid = await timGridChinh(page, /Mã đơn vị/);
    const soDongBanDau = await grid.locator('tbody tr').filter({ hasText: /.+/ }).count();
    expect(soDongBanDau, 'grid phải có dữ liệu trước khi lọc').toBeGreaterThanOrEqual(1);

    // Ô filter (probe: input.search-input, placeholder "Search") lọc client-side khi Enter
    const oFilter = page.locator('input.search-input').first();
    await expect(oFilter, 'ô filter search-input phải hiển thị').toBeVisible();

    // Gõ từ khóa chắc chắn không khớp → grid phải về trạng thái "Không có dữ liệu"
    await oFilter.fill('KhongTonTaiXYZ06');
    await oFilter.press('Enter');
    await expect(grid.getByText(/không có dữ liệu/i).first(),
      'filter không khớp → grid hiển thị "Không có dữ liệu"')
      .toBeVisible({ timeout: 15000 });
    console.log('Filter không khớp → grid hiển thị "Không có dữ liệu"');

    // Xóa từ khóa + Enter → dữ liệu trở lại (grid có dòng dữ liệu như ban đầu)
    await oFilter.fill('');
    await oFilter.press('Enter');
    await expect(grid.getByText(/không có dữ liệu/i)).toHaveCount(0, { timeout: 15000 });
    const soDongSauKhiXoa = await grid.locator('tbody tr').filter({ hasText: /.+/ }).count();
    expect(soDongSauKhiXoa, 'xóa filter → dữ liệu grid phải trở lại')
      .toBeGreaterThanOrEqual(soDongBanDau);
    console.log(`Xóa filter → grid trở lại ${soDongSauKhiXoa} dòng`);
  });

});