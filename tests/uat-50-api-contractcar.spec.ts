import { test, expect } from '@playwright/test';

/**
 * API DATA TEST — Phân hệ cấp đơn xe cơ giới (ContractCar) — UAT PJICO
 * https://uat-capdon.pjico.com.vn
 *
 * Test TẦNG API (fetch/xhr nội bộ của app), gồm:
 *   1) POST /ContractCar/RegisterSearch (postData rỗng) — catalog dropdown mã đơn vị, trạng thái, kiểu hợp đồng
 *   2) POST /ContractPublic/BrowserRegister (postData rỗng) — thông tin trình duyệt đăng ký
 *   3) UI↔API: mở /ContractCar/Search, bấm nút "Tìm kiếm" (button.btn-blue),
 *      bắt POST /ContractPublic/SearchResult — đối chiếu code/Total/số dòng với grid hiển thị
 *   4) Audit content-type: response là JSON nhưng header phải là application/json (app đang trả text/html → finding)
 *
 * AN TOÀN: chỉ gọi endpoint SEARCH/CATALOG/REGISTER (read-only), không gọi endpoint ghi dữ liệu.
 */

const BASE = 'https://uat-capdon.pjico.com.vn';

test('API ContractCar/RegisterSearch — HTTP 200, code 000, catalog các danh sách không rỗng, MA hợp lệ', async ({ context }) => {
  test.setTimeout(120000);

  // Endpoint catalog, postData rỗng "" — gọi trực tiếp qua context.request
  const resp = await context.request.post(`${BASE}/ContractCar/RegisterSearch`, { data: '' });
  expect(resp.status(), 'RegisterSearch phải trả HTTP 200').toBe(200);

  const json = await resp.json();
  expect(json.code, 'code phải là "000" (OK)').toBe('000');

  const data = json.data;
  expect(data, 'data phải là object chứ không null/undefined').toBeTruthy();
  expect(typeof data, 'data phải là object').toBe('object');

  // Các danh mục dropdown không được rỗng
  const lists = ['ma_dvi_ql', 'ttrang', 'kieu_hd', 'ttrang_pc', 'loai_hd'];
  for (const key of lists) {
    expect(Array.isArray(data[key]), `data.${key} phải là mảng`).toBeTruthy();
    expect(data[key].length, `data.${key} phải có phần tử (không rỗng)`).toBeGreaterThan(0);
  }

  // Mọi phần tử của các list phải có MA là chuỗi hợp lệ (không undefined)
  for (const key of lists) {
    for (const el of data[key]) {
      expect(typeof el.MA, `data.${key}[].MA phải là chuỗi, không undefined`).toBe('string');
    }
  }
  expect(data.ma_dvi_ql.length, 'danh sách mã đơn vị quản lý phải nhiều đơn vị').toBeGreaterThan(1);
});

test('API ContractPublic/BrowserRegister — HTTP 200, code 000, ma_dvi + các danh sách không rỗng', async ({ context }) => {
  test.setTimeout(120000);

  const resp = await context.request.post(`${BASE}/ContractPublic/BrowserRegister`, { data: '' });
  expect(resp.status(), 'BrowserRegister phải trả HTTP 200').toBe(200);

  const json = await resp.json();
  expect(json.code, 'code phải là "000" (OK)').toBe('000');

  const data = json.data;
  expect(data, 'data phải là object chứ không null/undefined').toBeTruthy();

  // ma_dvi: mã đơn vị hiện tại — chuỗi không rỗng
  expect(typeof data.ma_dvi, 'data.ma_dvi phải là chuỗi').toBe('string');
  expect(data.ma_dvi.length, 'data.ma_dvi không được rỗng').toBeGreaterThan(0);

  // Các danh sách đơn vị lọc / kiểu hợp đồng / trạng thái / nghiệp vụ / loại phòng ban không rỗng
  const lists = ['dvi_sl', 'kieu_hd', 'ttrang', 'nv', 'loai_pc'];
  for (const key of lists) {
    expect(Array.isArray(data[key]), `data.${key} phải là mảng`).toBeTruthy();
    expect(data[key].length, `data.${key} phải có phần tử (không rỗng)`).toBeGreaterThan(0);
  }

  // Mọi phần tử có MA là chuỗi hợp lệ (không undefined)
  for (const key of lists) {
    for (const el of data[key]) {
      expect(typeof el.MA, `data.${key}[].MA phải là chuỗi, không undefined`).toBe('string');
    }
  }
});

test('UI↔API: /ContractCar/Search bấm Tìm kiếm — SearchResult code 000, Total là số ≥ 0, khớp grid hiển thị', async ({ page }) => {
  test.setTimeout(120000);

  // Mở trang tìm kiếm cấp đơn xe cơ giới
  await page.goto(`${BASE}/ContractCar/Search`, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load').catch(() => {});

  // Nếu session hết hạn bị đẩy về login → fail sớm với thông điệp rõ ràng
  expect(await page.locator('#EMAIL').count(), 'không được redirect về trang đăng nhập').toBe(0);

  // Nút Tìm kiếm (button.btn-blue) phải hiển thị — bấm là truy vấn read-only, được phép
  const btnSearch = page.locator('button.btn-blue').first();
  await expect(btnSearch).toBeVisible({ timeout: 30000 });

  // Bắt response SearchResult khi bấm nút tìm (payload mã hóa client-side, không tự bịa)
  const respPromise = page.waitForResponse(
    r => /ContractPublic\/SearchResult/i.test(r.url()),
    { timeout: 45000 },
  );
  await btnSearch.click();
  const resp = await respPromise;

  expect(resp.status(), 'SearchResult phải trả HTTP 200').toBe(200);
  const json = await resp.json();
  expect(json.code, 'SearchResult phải trả code "000" (OK)').toBe('000');

  // Total phải là số, ≥ 0
  expect(typeof json.Total, 'Total phải là kiểu số').toBe('number');
  expect(json.Total, 'Total phải ≥ 0').toBeGreaterThanOrEqual(0);

  // Đợi grid cập nhật sau khi nhận response
  await page.waitForTimeout(2000);
  const grid = page.locator('table:visible').first();
  await expect(grid).toBeVisible({ timeout: 30000 });

  if (json.Total === 0) {
    // Không có dữ liệu: grid phải hiện dòng placeholder "Không có dữ liệu", không có dòng dữ liệu thật
    await expect(grid.locator('tbody tr').first()).toContainText(/không có dữ liệu/i);
    // data phải rỗng (chuỗi rỗng) — không lệch giữa Total=0 và grid có dòng dữ liệu
    const dataEmpty = json.data === '' || json.data === null || (Array.isArray(json.data) && json.data.length === 0);
    expect(dataEmpty, 'Total=0 thì data phải rỗng').toBeTruthy();
  } else {
    // Có dữ liệu: grid phải có dòng dữ liệu thật (không phải placeholder colspan)
    const placeholder = grid.locator('tbody tr td[colspan]');
    await expect(placeholder).toHaveCount(0);
    const rowCount = await grid.locator('tbody tr').count();
    expect(rowCount, 'grid phải có ít nhất 1 dòng dữ liệu khi Total > 0').toBeGreaterThan(0);
    // Nếu data là mảng dòng → số dòng JSON phải khớp số dòng grid hiển thị
    if (Array.isArray(json.data)) {
      expect(rowCount, 'số dòng grid phải khớp số dòng data trả về').toBe(json.data.length);
    }
  }
});

test('API audit: response JSON của ContractCar phải có header Content-Type application/json', async ({ page, context }) => {
  test.setTimeout(120000);

  // Kỳ vọng ĐÚNG: API trả JSON thì Content-Type phải là application/json.
  // Thực tế app trả text/html; charset=utf-8 → test này FAIL có chủ đích, ghi finding.

  // Endpoint catalog gọi trực tiếp
  const respCatalog = await context.request.post(`${BASE}/ContractCar/RegisterSearch`, { data: '' });
  const ctCatalog = (respCatalog.headers()['content-type'] || '').toLowerCase();
  // Body là JSON envelope {"code":"000",...} — kiểm tra đúng là JSON
  const bodyCatalog = await respCatalog.text();
  expect(bodyCatalog.trim().startsWith('{'), 'body phải là JSON').toBeTruthy();
  expect(ctCatalog, 'RegisterSearch trả JSON → Content-Type phải là application/json').toContain('application/json');

  // Endpoint search bắt qua UI
  await page.goto(`${BASE}/ContractCar/Search`, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load').catch(() => {});
  const btnSearch = page.locator('button.btn-blue').first();
  await expect(btnSearch).toBeVisible({ timeout: 30000 });
  const respPromise = page.waitForResponse(r => /ContractPublic\/SearchResult/i.test(r.url()), { timeout: 45000 });
  await btnSearch.click();
  const respSearch = await respPromise;
  const bodySearch = await respSearch.text();
  expect(bodySearch.trim().startsWith('{'), 'SearchResult body phải là JSON').toBeTruthy();
  const ctSearch = (respSearch.headers()['content-type'] || '').toLowerCase();
  expect(ctSearch, 'SearchResult trả JSON → Content-Type phải là application/json').toContain('application/json');
});