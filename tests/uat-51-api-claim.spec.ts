import { test, expect } from '@playwright/test';

/**
 * API DATA TEST — Khu vực 02: API phân hệ bồi thường (focus phát hiện quyền truy cập)
 * App UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn
 *
 * Phạm vi (CHỈ endpoint SEARCH/CATALOG/REGISTER — read-only, không gọi endpoint ghi dữ liệu):
 *   1. POST /ClaimPublic/ListRegisterOther (catalog, postData rỗng) — gọi trực tiếp,
 *      kiểm tra envelope + schema chuẩn (dvi_qly, ma_nv không rỗng) và content-type.
 *   2. Trang /ClaimGeneral/Search — bấm nút "Tìm hồ sơ" (button.btn-square.btn-p-input),
 *      bắt response /ClaimGeneral/ListSearch: envelope JSON phải parse được.
 *      SO SÁNH UI↔API: nếu envelope code !== "000" (lỗi business, ví dụ thiếu quyền
 *      nghiệp vụ) thì UI PHẢI hiển thị cảnh báo lỗi quyền — không được lặng lẽ
 *      hiện "Không có dữ liệu" (che lỗi phân quyền).
 *   3. POST /ClaimCargo/ListSearch — endpoint của trang /ClaimCargo/Search (trang vốn
 *      redirect về ErrorHandler). Kỳ vọng API phải trả JSON envelope như quy ước app.
 *
 * Điểm đã quan sát khi trinh sát (2026-09-03/04):
 *   - Mọi response là JSON envelope {"code","message","systemMessage","data","Total"}
 *     nhưng content-type lại là text/html (app trả JSON mà gán nhãn HTML).
 *   - ListSearch trả code "400" (thiếu quyền [BT,NX]) nhưng HTTP status vẫn 200.
 *   - UI hiện modal "Thông báo" chứa message lỗi quyền — hành vi đúng, không che lỗi.
 */

const BASE = 'https://uat-capdon.pjico.com.vn';

/** Kiểm tra session còn hạn: nếu thấy ô #EMAIL là đã bị đá về trang login */
async function assertConSession(page) {
  await expect(page.locator('#EMAIL')).toHaveCount(0, { timeout: 5000 });
}

// ===========================================================================
// 1. POST /ClaimPublic/ListRegisterOther — gọi trực tiếp (catalog, postData rỗng)
// ===========================================================================
test('API 02.1 — POST /ClaimPublic/ListRegisterOther: envelope code 000, schema catalog chuẩn (dvi_qly, ma_nv không rỗng)', async ({ request }) => {
  test.setTimeout(120000);

  const resp = await request.post(BASE + '/ClaimPublic/ListRegisterOther', { data: '' });
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

  // Schema data: dvi_qly (đơn vị quản lý) và ma_nv (mảng nghiệp vụ) phải là mảng KHÔNG rỗng
  const data = env.data;
  expect(data, 'data của catalog không được null khi code = 000').not.toBeNull();
  expect(Array.isArray(data.dvi_qly), 'data.dvi_qly phải là mảng').toBe(true);
  expect(data.dvi_qly.length, 'data.dvi_qly không được rỗng').toBeGreaterThan(0);
  expect(Array.isArray(data.ma_nv), 'data.ma_nv phải là mảng').toBe(true);
  expect(data.ma_nv.length, 'data.ma_nv không được rỗng').toBeGreaterThan(0);

  // Mỗi phần tử catalog phải có khóa MA (mã) để UI dùng cho dropdown
  for (const it of data.dvi_qly) {
    expect(typeof it.MA === 'string' && it.MA.length > 0, `dvi_qly phải có MA không rỗng: ${JSON.stringify(it)}`).toBe(true);
  }
  for (const it of data.ma_nv) {
    expect(typeof it.MA === 'string' && it.MA.length > 0, `ma_nv phải có MA không rỗng: ${JSON.stringify(it)}`).toBe(true);
  }
});

test('API 02.2 — /ClaimPublic/ListRegisterOther trả JSON phải gắn content-type application/json (không phải text/html)', async ({ request }) => {
  test.setTimeout(120000);

  const resp = await request.post(BASE + '/ClaimPublic/ListRegisterOther', { data: '' });
  expect(resp.status()).toBe(200);

  // Thân là JSON (đã xác nhận ở test 02.1) → nhãn content-type phải là JSON.
  // App đang trả text/html; charset=utf-8 cho thân JSON — sai semantic content-type.
  const ct = resp.headers()['content-type'] || '';
  expect(ct, 'Content-Type của response JSON phải chứa "json"').toContain('json');
});

// ===========================================================================
// 2. /ClaimGeneral/Search — bấm nút tìm, bắt /ClaimGeneral/ListSearch, so sánh UI↔API
// ===========================================================================
test('API 02.3 — /ClaimGeneral/Search: bấm "Tìm hồ sơ" bắt /ClaimGeneral/ListSearch — envelope JSON parse được, schema chuẩn', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto(BASE + '/ClaimGeneral/Search', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await assertConSession(page);

  const btn = page.locator('button.btn-square.btn-p-input', { hasText: /tìm hồ sơ/i }).first();
  await expect(btn).toBeVisible();

  const captured = page.waitForResponse(r => r.url().includes('/ClaimGeneral/ListSearch'), { timeout: 30000 })
    .then(r => r.text().then(t => ({ status: r.status() as number, body: t })));

  await btn.click();
  const api = await captured;

  expect(api.status).toBe(200);
  expect(api.body.trim().startsWith('{'), 'Thân ListSearch phải là JSON object').toBe(true);

  const env = JSON.parse(api.body);
  expect(env).toHaveProperty('code');
  expect(env).toHaveProperty('message');
  expect(env).toHaveProperty('systemMessage');
  expect(env).toHaveProperty('data');
  expect(env).toHaveProperty('Total');
  expect(typeof env.code).toBe('string');
  expect(typeof env.Total).toBe('number');

  // Ghi nhận thực tế: hiện tại tài khoản KTTT bị từ chối quyền nghiệp vụ BT
  // (code "400", message "…Chua duoc cap quyen su dung nghiep vu…[BT,NX]")
  console.log('ListSearch envelope: code =', JSON.stringify(env.code), '| message =', (env.message || '').slice(0, 160));
});

test('API 02.4 — /ClaimGeneral/Search: ListSearch trả content-type phải là JSON', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto(BASE + '/ClaimGeneral/Search', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await assertConSession(page);

  const btn = page.locator('button.btn-square.btn-p-input', { hasText: /tìm hồ sơ/i }).first();
  const captured = page.waitForResponse(r => r.url().includes('/ClaimGeneral/ListSearch'), { timeout: 30000 })
    .then(r => r.text().then(t => ({ ct: r.headers()['content-type'], body: t })));

  await btn.click();
  const api = await captured;

  // Thân response là JSON (test 02.3) → content-type phải là JSON, app đang trả text/html
  expect(api.ct, 'Content-Type của ListSearch phải chứa "json"').toContain('json');
});

test('API 02.5 — UI↔API: ListSearch từ chối quyền (code !== "000") thì UI PHẢI hiển thị cảnh báo quyền, không được che bằng "Không có dữ liệu"', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto(BASE + '/ClaimGeneral/Search', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await assertConSession(page);

  const btn = page.locator('button.btn-square.btn-p-input', { hasText: /tìm hồ sơ/i }).first();
  await expect(btn).toBeVisible();

  const captured = page.waitForResponse(r => r.url().includes('/ClaimGeneral/ListSearch'), { timeout: 30000 })
    .then(r => r.text().then(t => ({ status: r.status(), body: t })));

  await btn.click();
  const api = await captured;
  const env = JSON.parse(api.body);

  // Kỳ vọng đúng (phát hiện quyền truy cập): nếu API trả lỗi business
  // (code !== "000", ví dụ thiếu quyền nghiệp vụ), UI phải HIỂN THỊ cảnh báo
  // tương ứng — tuyệt đối không được lặng lẽ hiện "Không có dữ liệu".
  if (env.code !== '000') {
    console.log('ListSearch trả lỗi business, code =', env.code, '| message =', (env.message || '').slice(0, 160));

    // Cảnh báo quyền phải xuất hiện trên trang: modal/toast/alert chứa nội dung quyền
    const canhBao = page
      .locator('.modal, .sweet-alert, .swal2-container, .alert, .toast')
      .filter({ hasText: /quy[eê]n/i })
      .first();
    await expect(canhBao, 'UI phải hiển thị cảnh báo lỗi quyền (message từ API chứa chữ "quyền")').toBeVisible({ timeout: 15000 });

    // Và message trên UI phải khớp với message API (UI không được nuốt lỗi)
    const msgApi = (env.message || '').slice(0, 80);
    await expect(canhBao).toContainText(msgApi.split(',')[0]);
  } else {
    // Nếu được cấp quyền (code "000"): UI trả dữ liệu bình thường, grid phải được render
    console.log('ListSearch trả code 000 — tài khoản đã có quyền, grid phải hiển thị dữ liệu');
    await page.waitForTimeout(3000);
    await expect(page.locator('.k-grid, table')).toBeVisible();
  }
});

// ===========================================================================
// 3. /ClaimCargo/ListSearch — API của trang /ClaimCargo/Search (trang vốn redirect ErrorHandler)
// ===========================================================================
test('API 02.6 — POST /ClaimCargo/ListSearch phải trả JSON envelope (không phải trang HTML lỗi)', async ({ request }) => {
  test.setTimeout(120000);

  // Trang /ClaimCargo/Search hiện redirect 302 về /ErrorHandler/Index —
  // kỳ vọng tối thiểu: API tìm kiếm của phân hệ này phải trả JSON envelope
  // {"code":...,"message":...} như mọi endpoint khác của app.
  const resp = await request.post(BASE + '/ClaimCargo/ListSearch', { data: '' });
  expect(resp.status(), 'Endpoint API không được rơi về trang lỗi HTTP 200 giả').toBe(200);

  const text = await resp.text();
  // Quy ước app: mọi API đều trả JSON envelope — thân HTML "Trang thông báo lỗi" là lỗi
  expect(text.trim().startsWith('{'),
    'Thân /ClaimCargo/ListSearch phải là JSON envelope; thực tế nhận: ' + text.trim().slice(0, 120))
    .toBe(true);

  const env = JSON.parse(text);
  expect(env).toHaveProperty('code');
  expect(env).toHaveProperty('message');
});