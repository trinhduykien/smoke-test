import { test, expect } from '@playwright/test';

/**
 * API DATA TEST — Khu vực 04: API hệ thống mã — dữ liệu bảng "Mã đơn vị"
 * App UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn
 *
 * Phạm vi (CHỈ endpoint SEARCH/CATALOG/REGISTER — read-only, không gọi endpoint ghi dữ liệu):
 *   1. POST /CategorySystem/UnitRegister (catalog, postData rỗng "") — gọi trực tiếp,
 *      kiểm tra envelope + schema catalog chuẩn (cap, cap_hd, loai, vp — mỗi phần tử có MA/TEN).
 *   2. Trang /CategorySystem/Unit — trang tự gọi POST /CategorySystem/UnitSearch khi mở
 *      (payload mã hóa client-side, không thể tự bịa) → dùng browser thật: waitForResponse
 *      (fallback: bấm Enter vào ô tìm kiếm #MA — query read-only).
 *      Assert envelope code "000", parse chuỗi data tự chế (phân tách ';' giữa các bản ghi,
 *      '|' giữa các cột ma|ten_tat|dchi|ten): mỗi dòng ≥ 2 cột.
 *      SO SÁNH UI↔API: 10 bản ghi đầu của data phải khớp 10 hàng grid trang 1
 *      (table:visible tbody tr), tổng số bản ghi khớp phân trang 9 page-item
 *      (7 số trang = ceil(n/10) + nút ‹ ›).
 *   3. Audit content-type: response là JSON nhưng header phải là application/json
 *      (app đang trả text/html → finding chung).
 *
 * Điểm đã quan sát khi trinh sát bằng probe (2026-09-04, probe-api-04-hethongma.js):
 *   - UnitRegister: {"code":"000","data":{"cap":[5],"cap_hd":[2],"loai":[3],"vp":[2]},"Total":0}
 *     — mỗi phần tử {"MA":"...","TEN":"..."}; content-type text/html; charset=utf-8.
 *   - UnitSearch: {"code":"000","data":"00|00 ||Tổng Công ty...;TCT|TCT ...;..."} — chuỗi
 *     phân tách ';'/'|', 67 bản ghi, mỗi bản ghi đúng 4 cột; grid trang 1 có 10 hàng
 *     khớp 10 bản ghi đầu; phân trang 9 page-item (‹ 1..7 ›).
 */

const BASE = 'https://uat-capdon.pjico.com.vn';

/** Kiểm tra session còn hạn: nếu thấy ô #EMAIL là đã bị đá về trang login */
async function assertConSession(page) {
  await expect(page.locator('#EMAIL')).toHaveCount(0, { timeout: 5000 });
}

/**
 * Bắt response /CategorySystem/UnitSearch trên trang /CategorySystem/Unit.
 * Trang tự gọi UnitSearch ngay khi mở; nếu không có (hiếm) → bấm Enter
 * vào ô tìm kiếm #MA (query read-only) để buộc app gọi lại.
 */
async function batUnitSearch(page) {
  const captured = page.waitForResponse(r => r.url().includes('/CategorySystem/UnitSearch'), { timeout: 45000 })
    .then(r => r.text().then(t => ({ status: r.status(), ct: r.headers()['content-type'] || '', body: t })));

  await page.goto(BASE + '/CategorySystem/Unit', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await assertConSession(page);

  try {
    return await captured;
  } catch (e) {
    // Fallback: buộc tìm lại bằng phím Enter trong ô mã (read-only)
    const retry = page.waitForResponse(r => r.url().includes('/CategorySystem/UnitSearch'), { timeout: 30000 })
      .then(r => r.text().then(t => ({ status: r.status(), ct: r.headers()['content-type'] || '', body: t })));
    const oMa = page.locator('#MA');
    await expect(oMa).toBeVisible({ timeout: 15000 });
    await oMa.click();
    await oMa.press('Enter');
    return await retry;
  }
}

/** Tách chuỗi data tự chế của UnitSearch thành các bản ghi (mảng cột) */
function parseBanGhi(dataString) {
  return String(dataString)
    .split(';')
    .filter(x => x.length > 0)
    .map(ln => ln.split('|'));
}

// ===========================================================================
// 1. POST /CategorySystem/UnitRegister — gọi trực tiếp (catalog, postData rỗng)
// ===========================================================================
test('API 04.1 — POST /CategorySystem/UnitRegister: envelope code 000, schema catalog chuẩn (cap/cap_hd/loai/vp, mỗi phần tử có MA/TEN)', async ({ request }) => {
  test.setTimeout(120000);

  const resp = await request.post(BASE + '/CategorySystem/UnitRegister', { data: '' });
  expect(resp.status()).toBe(200);

  const text = await resp.text();
  expect(text.trim().startsWith('{'), 'Thân response phải bắt đầu bằng JSON object').toBe(true);

  const env = JSON.parse(text);
  // Envelope chuẩn của app: phải có đủ các khóa quy ước
  expect(env).toHaveProperty('code');
  expect(env).toHaveProperty('message');
  expect(env).toHaveProperty('systemMessage');
  expect(env).toHaveProperty('data');
  expect(env).toHaveProperty('Total');
  expect(env.code, 'Endpoint catalog phải trả code "000" (thành công)').toBe('000');

  // Schema data: 4 nhóm danh mục của bảng Mã đơn vị — đều phải là mảng KHÔNG rỗng
  const data = env.data;
  expect(data, 'data của catalog không được null khi code = 000').not.toBeNull();
  for (const key of ['cap', 'cap_hd', 'loai', 'vp']) {
    expect(Array.isArray(data[key]), `data.${key} phải là mảng`).toBe(true);
    expect(data[key].length, `data.${key} không được rỗng`).toBeGreaterThan(0);
    for (const it of data[key]) {
      expect(typeof it.MA === 'string' && it.MA.length > 0, `${key} phải có MA không rỗng: ${JSON.stringify(it)}`).toBe(true);
      expect(typeof it.TEN === 'string' && it.TEN.length > 0, `${key} phải có TEN không rỗng: ${JSON.stringify(it)}`).toBe(true);
    }
  }
  console.log('UnitRegister catalog: cap =', data.cap.length, '| cap_hd =', data.cap_hd.length,
    '| loai =', data.loai.length, '| vp =', data.vp.length, '| Total =', env.Total);
});

test('API 04.2 — /CategorySystem/UnitRegister trả JSON phải gắn content-type application/json (không phải text/html)', async ({ request }) => {
  test.setTimeout(120000);

  const resp = await request.post(BASE + '/CategorySystem/UnitRegister', { data: '' });
  expect(resp.status()).toBe(200);

  // Thân là JSON (đã xác nhận ở test 04.1) → nhãn content-type phải là JSON.
  // App đang trả text/html; charset=utf-8 cho thân JSON — sai semantic content-type.
  const ct = resp.headers()['content-type'] || '';
  expect(ct, 'Content-Type của response JSON phải chứa "json"').toContain('json');
});

// ===========================================================================
// 2. Trang /CategorySystem/Unit — bắt /CategorySystem/UnitSearch, parse data tự chế
// ===========================================================================
test('API 04.3 — /CategorySystem/Unit: UnitSearch trả code 000, chuỗi data parse được — mỗi dòng ≥ 2 cột (ma|ten_tat|dchi|ten)', async ({ page }) => {
  test.setTimeout(120000);

  const api = await batUnitSearch(page);

  expect(api.status, 'HTTP status của UnitSearch').toBe(200);
  expect(api.body.trim().startsWith('{'), 'Thân UnitSearch phải là JSON object').toBe(true);

  const env = JSON.parse(api.body);
  expect(env).toHaveProperty('code');
  expect(env).toHaveProperty('message');
  expect(env).toHaveProperty('data');
  expect(env.code, 'UnitSearch phải trả code "000" (tài khoản có quyền xem danh mục đơn vị)').toBe('000');

  // data là chuỗi tự chế: các bản ghi phân tách bằng ';', các cột bằng '|'
  expect(typeof env.data, 'UnitSearch code 000 → data phải là chuỗi bản ghi (không phải null)').toBe('string');
  expect((env.data as string).length, 'Chuỗi data không được rỗng').toBeGreaterThan(0);

  const records = parseBanGhi(env.data);
  console.log('UnitSearch: số bản ghi tách được =', records.length,
    '| phân bố số cột:', JSON.stringify(records.reduce((m, r) => { m[r.length] = (m[r.length] || 0) + 1; return m; }, {})));

  // Bảng Mã đơn vị phải có dữ liệu (không phải danh mục rỗng)
  expect(records.length, 'Danh mục đơn vị phải có bản ghi').toBeGreaterThanOrEqual(10);

  // Mỗi dòng phải có ÍT NHẤT 2 cột (cột MA bắt buộc + ít nhất 1 cột tên/địa chỉ)
  for (let i = 0; i < records.length; i++) {
    const cols = records[i];
    expect(cols.length, `Bản ghi ${i} phải có ≥ 2 cột, nhận: "${cols.join('|').slice(0, 80)}"`).toBeGreaterThanOrEqual(2);
    expect(cols[0].trim().length, `Bản ghi ${i}: cột MA (ma đơn vị) không được rỗng`).toBeGreaterThan(0);
  }
});

test('API 04.4 — UI↔API: 10 bản ghi đầu của UnitSearch khớp 10 hàng grid trang 1; tổng bản ghi khớp phân trang 9 page-item (7 số trang)', async ({ page }) => {
  test.setTimeout(120000);

  const api = await batUnitSearch(page);
  const env = JSON.parse(api.body);
  expect(env.code).toBe('000');

  const records = parseBanGhi(env.data);
  const tongBanGhi = records.length;
  console.log('Tổng bản ghi API =', tongBanGhi);

  // ----- Grid trang 1: table:visible tbody tr phải có đúng 10 hàng (page size 10) -----
  const gridRows = page.locator('table:visible tbody tr');
  await expect(gridRows.first(), 'Grid dữ liệu phải hiển thị sau khi UnitSearch trả code 000').toBeVisible({ timeout: 15000 });
  const gridCount = await gridRows.count();
  expect(gridCount, 'Grid trang 1 phải hiển thị đúng 10 dòng (page size)').toBe(10);

  // ----- 10 bản ghi đầu của API phải khớp 10 hàng grid (theo MA và tên đơn vị) -----
  expect(tongBanGhi, 'API phải trả đủ ≥ 10 bản ghi cho trang 1').toBeGreaterThanOrEqual(gridCount);
  for (let i = 0; i < gridCount; i++) {
    const rowText = (await gridRows.nth(i).innerText()).replace(/\s+/g, ' ').trim();
    const rec = records[i];
    const ma = rec[0].trim();
    expect(rowText.split(' ')[0], `Hàng grid ${i}: MA trên UI phải khớp cột MA của bản ghi ${i} trong data API (${ma})`).toBe(ma);
    // Cột "ten" (cột cuối của bản ghi) phải xuất hiện trong hàng grid tương ứng
    const ten = rec[rec.length - 1].trim();
    if (ten.length > 0) {
      expect(rowText, `Hàng grid ${i} phải chứa tên đơn vị "${ten}" như data API trả về`).toContain(ten);
    }
  }
  console.log('10 bản ghi đầu API khớp 10 hàng grid trang 1 (MA:', records.slice(0, 10).map(r => r[0]).join(', '), ')');

  // ----- Phân trang: tổng số page-item + số trang đánh số phải khớp tổng bản ghi -----
  const pagination = await page.evaluate(() => ({
    itemCount: document.querySelectorAll('.page-item').length,
    tokens: [...document.querySelectorAll('.page-item')].map(p => (p.innerText || '').trim()),
  }));
  console.log('Phân trang:', JSON.stringify(pagination));
  expect(pagination.itemCount, 'Phân trang phải có 9 page-item (‹ + 7 số trang + ›) với dữ liệu hiện tại').toBe(9);

  const soTrangDanhSo = pagination.tokens.filter(t => /^\d+$/.test(t)).length;
  expect(soTrangDanhSo, `Số trang đánh số phải khớp ceil(tổng bản ghi/10) = ceil(${tongBanGhi}/10)`).toBe(Math.ceil(tongBanGhi / 10));
});

// ===========================================================================
// 3. FINDING chung: content-type của API JSON bị gán nhãn text/html
// ===========================================================================
test('API 04.5 — /CategorySystem/UnitSearch trả JSON phải gắn content-type application/json (không phải text/html)', async ({ page }) => {
  test.setTimeout(120000);

  const api = await batUnitSearch(page);

  // Thân response là JSON (test 04.3) → content-type phải là JSON, app đang trả text/html
  expect(api.ct, 'Content-Type của UnitSearch phải chứa "json"').toContain('json');
});