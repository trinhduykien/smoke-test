import { test, expect } from '@playwright/test';

/**
 * API DATA TEST 05 — BÁO CÁO CSSK + THANH TOÁN + QR — UAT PJICO
 * (https://uat-capdon.pjico.com.vn — test TẦNG API fetch/xhr nội bộ của app)
 *
 * Endpoints kiểm tra (toàn bộ READ-ONLY: catalog/search/register, KHÔNG gọi
 * endpoint Insert/Save/Update/Delete/Trinh/Approve/Edit/Create/Upload/Import):
 *
 *   1) POST /InsuranceFee/PaymentFtsRegister (postData rỗng "") — catalog thanh toán:
 *      kỳ vọng {"code":"000","data":{"ma_bh":[{MA,TEN},…]}} — mảng ma_bh không rỗng.
 *   2) POST /ContractPerson/FindNGRegister (payload mã hóa client-side) — bắn khi
 *      mở /Report/HealthReport (báo cáo CSSK): kỳ vọng code "000" và dvi_qly có TCT.
 *   3) POST /QRCODEBase/BranchUnitQRCODESearch (payload mã hóa) — bắn khi mở
 *      /Qrcode/SearchQrcode: kỳ vọng code "000", Total >= 0.
 *   4) GET /InsuranceFee/qrcode — request ảnh QR thu phí bắn khi mở
 *      /InsuranceFee/SearchPaymentFts. Kỳ vọng ĐÚNG: HTTP 200 + content-type image/*
 *      → thực tế app trả 302 chuyển /ErrorHandler/Index, nhãn text/html, body HTML
 *      "Trang thông báo lỗi" thay vì ảnh QR → test FAIL, ghi FINDING (QR hỏng).
 *   5) Audit content-type: mọi endpoint JSON của app trả về nhãn "text/html"
 *      trong khi body là JSON — kỳ vọng ĐÚNG là "application/json" → test FAIL,
 *      ghi FINDING chung.
 *
 * Quy ước envelope của app: {"code":"000"=OK|"400"=lỗi business,…,
 * "message":…,"systemMessage":…,"data":…,"Total":…}
 */

const TIMEOUT = 120000;

// ============ (1) Catalog thanh toán: PaymentFtsRegister ============
test('[API 05] PaymentFtsRegister — catalog ma_bh trả đủ danh mục mã loại BH', async ({ request }) => {
  test.setTimeout(TIMEOUT);

  // Endpoint catalog: postData rỗng "" (app gọi thế này, gọi trực tiếp được)
  const resp = await request.post('/InsuranceFee/PaymentFtsRegister', { data: '' });
  expect(resp.status()).toBe(200);

  const json = await resp.json();
  console.log('PaymentFtsRegister code:', json.code);

  // Envelope chuẩn: code "000" = OK
  expect(json.code).toBe('000');

  // data.ma_bh là mảng danh mục không rỗng
  const maBh = json.data?.ma_bh;
  expect(Array.isArray(maBh)).toBeTruthy();
  expect(maBh.length).toBeGreaterThan(0);

  // Mỗi phần tử có MA/TEN hợp lệ (chuỗi không null)
  for (const item of maBh) {
    expect(typeof item.MA).toBe('string');
    expect(item.MA).not.toBeNull();
    expect(item.TEN).not.toBeNull();
  }

  // Có mục "Tất cả" (MA "*") và các loại nghiệp vụ xe đã quan sát
  const mas = maBh.map((x: { MA: string }) => x.MA);
  expect(mas).toContain('*');
  expect(mas).toContain('2B');
  expect(mas).toContain('XE');

  // Catalog khác cũng phải trả
  for (const key of ['kieu_lke_tt', 'nv', 'pt']) {
    expect(Array.isArray(json.data?.[key])).toBeTruthy();
    expect(json.data[key].length).toBeGreaterThan(0);
  }
});

// ============ (2) Báo cáo CSSK: FindNGRegister khi mở /Report/HealthReport ============
test('[API 05] HealthReport — FindNGRegister trả code 000, danh sách đơn vị quản lý có TCT', async ({ page }) => {
  test.setTimeout(TIMEOUT);

  // Request FindNGRegister (payload mã hóa client-side) bắn ngay khi trang load
  const respPromise = page.waitForResponse(
    (r) => r.url().includes('/ContractPerson/FindNGRegister'),
    { timeout: 60000 },
  );
  await page.goto('/Report/HealthReport', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const resp = await respPromise;

  expect(resp.status()).toBe(200);
  const json = await resp.json();
  console.log('FindNGRegister code:', json.code, '| số đơn vị:', json.data?.dvi_qly?.length);

  expect(json.code).toBe('000');
  expect(json.systemMessage).toBeNull();

  // dvi_qly: mảng đơn vị quản lý, có TCT (Tổng công ty) — đã quan sát trên UAT
  const dviQly = json.data?.dvi_qly;
  expect(Array.isArray(dviQly)).toBeTruthy();
  expect(dviQly.length).toBeGreaterThan(1);
  expect(dviQly.some((d: { MA: string }) => d.MA === 'TCT')).toBeTruthy();

  // Mỗi đơn vị có MA/TEN hợp lệ
  for (const d of dviQly) {
    expect(d.MA).not.toBeUndefined();
    expect(d.TEN).not.toBeUndefined();
  }
});

// ============ (3) Danh sách QR: BranchUnitQRCODESearch khi mở /Qrcode/SearchQrcode ============
test('[API 05] SearchQrcode — BranchUnitQRCODESearch trả code 000, Total >= 0', async ({ page }) => {
  test.setTimeout(TIMEOUT);

  // Request BranchUnitQRCODESearch (payload mã hóa) bắn ngay khi trang load
  const respPromise = page.waitForResponse(
    (r) => r.url().includes('/QRCODEBase/BranchUnitQRCODESearch'),
    { timeout: 60000 },
  );
  await page.goto('/Qrcode/SearchQrcode', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const resp = await respPromise;

  expect(resp.status()).toBe(200);
  const json = await resp.json();
  console.log('BranchUnitQRCODESearch code:', json.code, '| Total:', json.Total);

  expect(json.code).toBe('000');
  // Total luôn là số >= 0 (0 khi chưa chọn điều kiện lọc — đã quan sát)
  expect(json.Total).toBeGreaterThanOrEqual(0);
  expect(typeof json.Total).toBe('number');
});

// ============ (4) FINDING: ảnh QR thu phí hỏng trên trang thanh toán ============
test('[API 05] SearchPaymentFts — request ảnh QR (/InsuranceFee/qrcode) phải trả về ảnh, không phải trang lỗi', async ({ page }) => {
  test.setTimeout(TIMEOUT);

  // request GET /InsuranceFee/qrcode bắn ngay khi trang Tra cứu thông tin thanh toán load
  const qrResponses: { url: string; status: number; ct: string; location: string | null }[] = [];
  page.on('response', (r) => {
    if (/\/InsuranceFee\/qrcode/i.test(r.url())) {
      qrResponses.push({
        url: r.url(),
        status: r.status(),
        ct: r.headers()['content-type'] || '',
        location: r.headers()['location'] || null,
      });
    }
  });

  await page.goto('/InsuranceFee/SearchPaymentFts', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  console.log('Số request /InsuranceFee/qrcode bắt được:', qrResponses.length);
  for (const q of qrResponses) console.log('  QR response:', JSON.stringify(q));

  // Trang có bắn request ảnh QR (tính năng QR thu phí có mặt trên trang)
  expect(qrResponses.length).toBeGreaterThan(0);

  const qr = qrResponses[0];

  // Kỳ vọng ĐÚNG cho endpoint ảnh QR:
  //   - HTTP 200 (không phải 302 chuyển trang lỗi)
  //   - content-type là image/*
  // Thực tế app sai: 302 → /ErrorHandler/Index, text/html → test FAIL (finding).
  expect(qr.status).toBe(200);
  expect(qr.ct).toMatch(/^image\//i);
  expect(qr.location).toBeNull(); // không được redirect sang trang lỗi
});

// ============ (5) FINDING chung: content-type của API JSON bị gán nhãn text/html ============
test('[API 05] Audit — các endpoint JSON phải trả content-type application/json', async ({ page, request }) => {
  test.setTimeout(TIMEOUT);

  // Endpoint 1: catalog gọi trực tiếp
  const r1 = await request.post('/InsuranceFee/PaymentFtsRegister', { data: '' });
  const j1 = await r1.json(); // body parse được JSON → chắc chắn là JSON
  expect(j1.code).toBe('000');

  // Endpoint 2: FindNGRegister qua browser thật (payload mã hóa)
  const r2Promise = page.waitForResponse(
    (r) => r.url().includes('/ContractPerson/FindNGRegister'),
    { timeout: 60000 },
  );
  await page.goto('/Report/HealthReport', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const r2 = await r2Promise;
  const j2 = await r2.json();
  expect(j2.code).toBe('000');

  const ct1 = (r1.headers()['content-type'] || '').toLowerCase();
  const ct2 = (r2.headers()['content-type'] || '').toLowerCase();
  console.log('PaymentFtsRegister content-type:', ct1);
  console.log('FindNGRegister content-type:', ct2);

  // Body là JSON hợp lệ → nhãn phải là application/json, không phải text/html
  expect(ct1).toContain('application/json');
  expect(ct2).toContain('application/json');
});