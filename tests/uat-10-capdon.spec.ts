import { test, expect, Page, Response } from '@playwright/test';

/**
 * SMOKE TEST — Phân hệ CẤP ĐƠN
 * App UAT: https://uat-capdon.pjico.com.vn (PJICO: Nền tảng cấp đơn bảo hiểm)
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session đã lưu tại .auth/uat.json)
 *
 * Phạm vi: 19 trang tra cứu/tìm kiếm hợp đồng của các nghiệp vụ cấp đơn
 *   - Xe cơ giới, xe máy, trình phí xe cơ giới
 *   - Cháy nổ bắt buộc, tài sản hỗn hợp, tài sản kỹ thuật (nv=31/33/34), chào phí
 *   - Con người: tai nạn sử dụng điện (import Excel), CSSK, Combo, Con người
 *   - Hàng hóa (TLO + thường), Tàu thuyền
 *
 * Mỗi test chỉ làm (read-only):
 *   1) page.goto(path) → assert HTTP status < 400
 *   2) Assert KHÔNG phải trang lỗi server (body không chứa Server Error / Runtime Error / Exception)
 *   3) Assert KHÔNG bị đá về trang ErrorHandler / login
 *   4) Assert tiêu đề trang + 1 ô tìm kiếm ổn định hiển thị
 *
 * KHÔNG bấm bất kỳ nút tạo/sửa/xóa/lưu nào (chỉ load trang, thuần đọc).
 */

/**
 * Helper smoke chung cho một trang phân hệ CẤP ĐƠN.
 * @param page         Page Playwright
 * @param path         Path tương đối (Playwright tự ghép baseURL)
 * @param headingText  Tiêu đề chính của trang (quan sát được qua probe)
 * @param fieldSel     Selector 1 ô tìm kiếm ổn định của form tra cứu
 */
async function smokeCapDon(
  page: Page,
  path: string,
  headingText: string,
  fieldSel: string
): Promise<Response | null> {
  const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });

  // 1) HTTP status phải < 400
  expect(resp ? resp.status() : 0).toBeLessThan(400);

  // 2) Không phải trang lỗi server
  const bodyText = (await page.evaluate(() => document.body.innerText || '')).slice(0, 8000);
  expect(bodyText, `Trang ${path} hiển thị lỗi server`).not.toMatch(
    /Server Error|Runtime Error|Exception/i
  );

  // 3) Không bị đá về ErrorHandler (trang lỗi của app) hay trang đăng nhập
  expect(page.url(), `Trang ${path} bị redirect bất thường`).not.toMatch(/ErrorHandler|\/Login/i);

  // 4) Tiêu đề trang hiện có trong nội dung + ô tìm kiếm hiển thị
  //    (Lưu ý: #pjMenuSearchInput là ô search trong menu top, ẩn mặc định — không dùng assert visible)
  expect(bodyText, `Trang ${path} thiếu tiêu đề "${headingText}"`).toContain(headingText);
  await expect(page.locator(fieldSel).first()).toBeVisible({ timeout: 30000 });

  return resp;
}

// ---------------------------------------------------------------------------
// XE CƠ GIỚI / XE MÁY
// ---------------------------------------------------------------------------

test('[CẤP ĐƠN] Tìm kiếm hợp đồng xe cơ giới tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractCar/Search',
    'Tìm hợp đồng / Giấy chứng nhận xe cơ giới',
    '#bien_xe'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng xe máy tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/tim-kiem-xe-may',
    'Tìm hợp đồng / Giấy chứng nhận xe máy',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng trình phí xe cơ giới tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractCar/SearchFeeApprove',
    'Tìm hợp đồng trình phí/trình phân cấp',
    '#ma_kh_tim'
  );
});

// ---------------------------------------------------------------------------
// CHÁY NỔ / TÀI SẢN
// ---------------------------------------------------------------------------

test('[CẤP ĐƠN] Tìm kiếm hợp đồng cháy nổ bắt buộc tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/PropertyFireInsurance/Search',
    'Danh sách Hợp đồng cháy nổ bắt buộc',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng tài sản hỗn hợp tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractAssetsMixed/Search',
    'Danh sách',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng tài sản kỹ thuật (nv=31) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractProperty/Search?nv=31',
    'Danh sách Hợp đồng Tài sản, Kỹ thuật',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng tài sản kỹ thuật (nv=33) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractProperty/Search?nv=33',
    'Danh sách Hợp đồng Tài sản, Kỹ thuật',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng tài sản kỹ thuật (nv=34) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractProperty/Search?nv=34',
    'Danh sách Hợp đồng Tài sản, Kỹ thuật',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Danh sách đăng ký chào phí tài sản kỹ thuật tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractProperty/Search_fee',
    'Danh sách đăng ký chào phí nghiệp vụ Tài sản-Kỹ thuật',
    '#so_tc'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng chào phí tài sản kỹ thuật tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractProperty/Search_PropertyFee',
    'Danh sách Bản chào phí/Hợp đồng Tài sản, Kỹ thuật',
    '#so_tc_tim'
  );
});

// ---------------------------------------------------------------------------
// CON NGƯỜI
// ---------------------------------------------------------------------------

test('[CẤP ĐƠN] Nhập danh sách BH tai nạn sử dụng điện từ Excel tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractPerson/Import_sk_sddien',
    'Nhập danh sách bảo hiểm tai nạn sử dụng điện từ Excel',
    '#so_lo'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng CSSK sản phẩm Combo tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractPerson/SearchCombo?loaibh=6901',
    'Tìm hợp đồng CSSK sản phẩm Combo',
    '#so_hd'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng chăm sóc sức khỏe (loaibh=69) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractPerson/Search?loaibh=69',
    'Tìm hợp đồng chăm sóc sức khỏe',
    '#so_hd'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng con người (loaibh=NG) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractPerson/Search?loaibh=NG',
    'Tìm hợp đồng Con người',
    '#so_hd'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng chăm sóc sức khỏe (loaibh=62) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractPerson/Search?loaibh=62',
    'Tìm hợp đồng chăm sóc sức khỏe',
    '#so_hd'
  );
});

test('[CẤP ĐƠN] Tìm hợp đồng chăm sóc sức khỏe (loaibh=6101) tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractPerson/Search?loaibh=6101',
    'Tìm hợp đồng chăm sóc sức khỏe',
    '#so_hd'
  );
});

// ---------------------------------------------------------------------------
// HÀNG HÓA / TÀU THUYỀN
// ---------------------------------------------------------------------------

test('[CẤP ĐƠN] Tìm kiếm hợp đồng hàng hóa TLO tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractCargo/SearchTLO',
    'Danh sách Hợp đồng Hàng hóa',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng hàng hóa tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractCargo/Search',
    'Danh sách Hợp đồng Hàng hóa',
    '#so_hd_tim'
  );
});

test('[CẤP ĐƠN] Tìm kiếm hợp đồng tàu thuyền tải trang thành công', async ({ page }) => {
  test.setTimeout(120000);
  await smokeCapDon(
    page,
    '/ContractShip/Search',
    'Danh sách Hợp đồng Tàu thuyền',
    '#so_hd_tim'
  );
});