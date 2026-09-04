import { test, expect, type APIResponse } from '@playwright/test';

/**
 * API DATA TEST 07 — API MENU FRAGMENT /khud/MenuRegister + AUDIT TOÀN BỘ ENVELOPE
 * (UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn)
 *
 * Đối tượng test: TẦNG API (fetch/xhr nội bộ của app), không chỉ UI.
 *
 * (1) Mỗi trang đều gọi GET /khud/MenuRegister?_=<ts> để lấy HTML fragment menu.
 *     Test mở 3 trang (/Home/Index, /ContractCar/Search, /CategorySystem/Unit),
 *     mỗi trang waitForResponse /khud/MenuRegister rồi assert:
 *       - HTTP 200
 *       - body chứa đủ 5 menu chính: Cấp đơn, Thanh toán, Bồi thường, Tái bảo hiểm, Tiện ích
 *         (match case-insensitive)
 *       - body chứa tên user TRINH DUY KIEN hoặc menu user
 *         (menu user = mục quản trị người dùng /CategorySystem/UserAccount trong fragment)
 *
 * (2) Gọi trực tiếp GET /khud/MenuRegister qua context.request.get (giữ cookies session)
 *     — assert tương tự mục (1).
 *
 * (3) ENVELOPE AUDIT chung: 4 endpoint catalog đều trả JSON envelope chuẩn
 *     {"code","message","systemMessage","data"} — mỗi endpoint assert:
 *       - HTTP 200
 *       - JSON parse được
 *       - có đủ 4 trường envelope: code, message, systemMessage, data
 *       - code === "000" (thành công business)
 *       - data không null
 *     Endpoint nào thiếu trường envelope → finding về API contract không nhất quán.
 *
 * Ghi chú từ probe thật (probe-api-07-menu-endpoint.js, chạy 2026-09-04):
 *   - MenuRegister trả HTTP 200, text/html, body ~19KB chứa đủ 5 menu chính.
 *   - Fragment KHÔNG chứa tên user "TRINH DUY KIEN" — tên user nằm trong HTML
 *     của trang chính (<span id="ttin_nsd">TRINH DUY KIEN (TCT)</span>), còn fragment
 *     chứa menu user (/CategorySystem/UserAccount — "Mã người dùng").
 *   - Cả 4 endpoint catalog trả JSON envelope đúng 4 trường, code "000", data != null,
 *     nhưng content-type lại là "text/html" thay vì "application/json" (finding).
 */

const MAIN_MENUS = ['Cấp đơn', 'Thanh toán', 'Bồi thường', 'Tái bảo hiểm', 'Tiện ích'];

// 3 trang đại diện: dashboard, tra cứu nghiệp vụ, danh mục hệ thống
const PAGES = ['/Home/Index', '/ContractCar/Search', '/CategorySystem/Unit'];

// 4 endpoint catalog (read-only, postData rỗng như app hay gửi)
const CATALOG_ENDPOINTS = [
  '/ContractCar/RegisterSearch',
  '/ClaimPublic/ListRegisterOther',
  '/InsuranceFee/PaymentFtsRegister',
  '/CategorySystem/UnitRegister',
];

/**
 * Assert một HTML fragment menu (/khud/MenuRegister) là hợp lệ:
 * - HTTP 200
 * - chứa đủ 5 menu chính (case-insensitive)
 * - chứa tên user TRINH DUY KIEN hoặc menu user (UserAccount / "người dùng")
 */
async function expectValidMenuFragment(resp: APIResponse, context: string) {
  expect(resp.status(), `${context}: HTTP status phải là 200`).toBe(200);

  const body = await resp.text();
  const lower = body.toLowerCase();

  // 5 menu chính — match case-insensitive
  for (const menu of MAIN_MENUS) {
    expect(lower, `${context}: fragment phải chứa menu chính "${menu}"`).toContain(menu.toLowerCase());
  }

  // Tên user HOẶC menu user trong fragment
  const hasUserName = body.toUpperCase().includes('TRINH DUY KIEN');
  const hasUserMenu = /useraccount|người dùng/i.test(body);
  expect(
    hasUserName || hasUserMenu,
    `${context}: fragment phải chứa tên user "TRINH DUY KIEN" hoặc menu user (thực tế: userName=${hasUserName}, userMenu=${hasUserMenu})`
  ).toBe(true);

  console.log(`[${context}] HTTP ${resp.status()} | content-type: ${resp.headers()['content-type'] || '(trống)'} | body ${body.length} ký tự | userName=${hasUserName} | userMenu=${hasUserMenu}`);
  return body;
}

/**
 * ENVELOPE AUDIT — assert một response API catalog tuân thủ envelope chuẩn:
 * - HTTP 200
 * - JSON parse được
 * - có đủ 4 trường: code, message, systemMessage, data
 * - code === "000"
 * - data không null
 * Endpoint nào thiếu trường → expect fail → finding API contract không nhất quán.
 */
async function expectCatalogEnvelope(resp: APIResponse, ep: string) {
  expect(resp.status(), `${ep}: HTTP status phải là 200`).toBe(200);

  const ct = resp.headers()['content-type'] || '(trống)';
  const body = await resp.text();
  console.log(`[${ep}] HTTP ${resp.status()} | content-type: ${ct} | body: ${body.replace(/\s+/g, ' ').slice(0, 120)}`);

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(body) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`${ep}: body phải parse được thành JSON (content-type="${ct}", 150 ký tự đầu="${body.slice(0, 150)}") — ${(e as Error).message}`);
  }

  // Đủ 4 trường envelope — thiếu trường nào là vi phạm API contract
  for (const field of ['code', 'message', 'systemMessage', 'data']) {
    expect(
      Object.prototype.hasOwnProperty.call(json, field),
      `${ep}: envelope phải có đủ trường "${field}" (keys thực tế: ${JSON.stringify(Object.keys(json))})`
    ).toBe(true);
  }

  // code === "000" (nghiệp vụ thành công)
  expect(json['code'], `${ep}: envelope.code phải là "000"`).toBe('000');

  // data không null
  expect(json['data'], `${ep}: envelope.data không được null (phải là object dữ liệu danh mục)`).not.toBeNull();
}

test.describe('07 — API menu fragment /khud/MenuRegister + audit toàn bộ envelope', () => {

  // ========== (1) Menu fragment gọi bởi 3 trang ==========
  for (const path of PAGES) {
    test(`(1) trang ${path} gọi /khud/MenuRegister trả fragment menu đầy đủ`, async ({ page }) => {
      test.setTimeout(120000);

      // Bắt response MenuRegister khi trang khởi tạo
      const respPromise = page.waitForResponse(
        r => r.url().includes('/khud/MenuRegister'),
        { timeout: 60000 }
      );
      await page.goto(path, { timeout: 90000, waitUntil: 'domcontentloaded' });
      const resp = await respPromise;

      await expectValidMenuFragment(resp, `trang ${path} → /khud/MenuRegister`);

      // Chờ menu render xong — UI phải hiển thị đủ 5 menu chính (fragment đã được gắn vào DOM)
      for (const menu of MAIN_MENUS) {
        await expect(
          page.getByText(menu, { exact: true }).first(),
          `UI trang ${path} phải hiển thị menu "${menu}" sau khi gắn fragment`
        ).toBeVisible({ timeout: 30000 });
      }

      // Tên user hiển thị trên trang (nằm trong HTML chính, span #ttin_nsd —
      // không nằm trong fragment; đây là nguồn tên user thực tế của app)
      const userInfo = page.locator('#ttin_nsd');
      await expect(userInfo.first(), `trang ${path} phải hiển thị tên user (#ttin_nsd)`).toBeVisible({ timeout: 30000 });
      await expect(userInfo.first(), `tên user hiển thị phải là TRINH DUY KIEN`).toContainText(/TRINH DUY KIEN/i);
    });
  }

  // ========== (2) Gọi trực tiếp GET /khud/MenuRegister (giữ cookies) ==========
  test('(2) GET trực tiếp /khud/MenuRegister qua context.request.get trả fragment menu đầy đủ', async ({ context }) => {
    test.setTimeout(120000);

    const resp = await context.request.get(`/khud/MenuRegister?_=${Date.now()}`, { timeout: 30000 });
    const body = await expectValidMenuFragment(resp, 'GET trực tiếp /khud/MenuRegister');

    // Fragment phải là HTML (chứa thẻ li/a của menu), không phải JSON envelope hay trang login
    expect(body, 'fragment phải chứa thẻ <li> của menu').toContain('<li');
    expect(body.toLowerCase(), 'fragment phải chứa thẻ <a> của menu').toContain('<a');
  });

  // ========== (3) Envelope audit: 4 endpoint catalog ==========
  for (const ep of CATALOG_ENDPOINTS) {
    test(`(3) envelope chuẩn (code/message/systemMessage/data, code="000") — ${ep}`, async ({ request }) => {
      test.setTimeout(120000);

      // Gọi đúng như app: POST body rỗng ""
      const resp = await request.post(ep, {
        data: '',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
      });
      await expectCatalogEnvelope(resp, ep);
    });
  }
});