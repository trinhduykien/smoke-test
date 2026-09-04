import { test, expect } from '@playwright/test';

/**
 * API DATA TEST 06 — API ROBUSTNESS: xử lý payload xấu an toàn (UAT cấp đơn PJICO)
 *
 * Mục đích: kiểm tra các endpoint CATALOG/SEARCH (read-only) có chịu đựng được
 * payload ĐỊNH DẠNG SAI mà KHÔNG crash (HTTP 500 / trang HTML lỗi) hay không.
 * KHÔNG gửi payload SQL/XSS — chỉ gửi các body sai cấu trúc.
 *
 * Các endpoint test (đều là endpoint danh mục, postData bình thường là ""):
 *   /ContractCar/RegisterSearch
 *   /ContractPublic/BrowserRegister
 *   /ClaimPublic/ListRegisterOther
 *   /InsuranceFee/PaymentFtsRegister
 *   /CategorySystem/UnitRegister
 *
 * Mỗi endpoint gửi đúng 4 request (mỗi case 1 request, không hammer):
 *   (a) body rỗng ""
 *   (b) JSON sai định dạng: {"data":12345}        (số thay vì chuỗi)
 *   (c) chuỗi text thuần:   "garbage-not-json"     (không phải JSON)
 *   (d) JSON hợp lệ nhưng data là chuỗi mã hóa rác: {"data":"@@@not-valid-base64@@@","cot":"ma"}
 *
 * KỲ VỌNG ĐÚNG cho mọi case:
 *   1. HTTP status < 500 (tốt nhất 200 hoặc 400 — code lỗi business được chấp nhận)
 *   2. Response là JSON envelope parse được (content-type json HOẶC body bắt đầu bằng '{')
 *      và envelope có trường "code"
 *
 * Ghi chú từ probe thật (probe-api-06-robustness.js, 2026-09-04):
 *   - App trả JSON envelope nhưng gán content-type là text/html → test chấp nhận cả hai
 *     (content-type json HOẶC body bắt đầu '{') theo đúng yêu cầu đề bài.
 */

const ENDPOINTS = [
  '/ContractCar/RegisterSearch',
  '/ContractPublic/BrowserRegister',
  '/ClaimPublic/ListRegisterOther',
  '/InsuranceFee/PaymentFtsRegister',
  '/CategorySystem/UnitRegister',
];

// Các case payload xấu — chỉ sai ĐỊNH DẠNG, KHÔNG chứa SQL/XSS
const BAD_PAYLOADS: Array<{ name: string; data: string }> = [
  { name: '(a) body rỗng ""', data: '' },
  { name: '(b) JSON sai định dạng {"data":12345}', data: '{"data":12345}' },
  { name: '(c) text thuần "garbage-not-json"', data: 'garbage-not-json' },
  { name: '(d) JSON hợp lệ, data mã hóa rác {"data":"@@@not-valid-base64@@@","cot":"ma"}', data: '{"data":"@@@not-valid-base64@@@","cot":"ma"}' },
];

/**
 * Assertion kỳ vọng ĐÚNG cho response robust:
 * HTTP < 500 VÀ response là JSON envelope parse được (content-type json
 * HOẶC body bắt đầu '{') VÀ envelope có trường "code".
 */
async function expectRobustEnvelope(resp: import('@playwright/test').APIResponse, context: string) {
  // 1. Không được trả lỗi server (500) — endpoint phải xử lý payload xấu an toàn
  expect(resp.status(), `${context}: HTTP status phải < 500 (không crash server)`).toBeLessThan(500);

  // 2. Response phải là JSON envelope parse được
  const ct = (resp.headers()['content-type'] || '').toLowerCase();
  const body = await resp.text();
  let json: unknown = null;
  let jsonOk = false;
  try {
    json = JSON.parse(body);
    jsonOk = true;
  } catch {
    jsonOk = false;
  }
  const looksJson = ct.includes('json') || body.trimStart().startsWith('{');
  expect(looksJson, `${context}: response phải là JSON (content-type="${ct}", 100 ký tự đầu body="${body.slice(0, 100)}" — không được trả HTML crash page)`).toBe(true);

  // 3. Envelope phải parse được thành object có trường "code"
  expect(jsonOk, `${context}: body phải parse được thành JSON object`).toBe(true);
  expect(typeof (json as Record<string, unknown>).code, `${context}: envelope JSON phải có trường "code"`).not.toBe('undefined');
}

test.describe('06 — API robustness: endpoint catalog chịu đựng payload xấu', () => {
  for (const ep of ENDPOINTS) {
    test(`payload xấu không làm crash ${ep}`, async ({ request }) => {
      test.setTimeout(120000);

      // Baseline: gọi đúng như app (body rỗng) để xác nhận endpoint hoạt động bình thường
      const base = await request.post(ep, {
        data: '',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
      });
      console.log(`[baseline] POST ${ep} → HTTP ${base.status()}`);
      await expectRobustEnvelope(base, `${ep} baseline`);

      // Mỗi case payload xấu: đúng 1 request, kỳ vọng vẫn trả JSON envelope an toàn
      for (const c of BAD_PAYLOADS) {
        const resp = await request.post(ep, {
          data: c.data,
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
        });
        const body = await resp.text();
        console.log(`[${c.name}] POST ${ep} → HTTP ${resp.status()} | body: ${body.replace(/\s+/g, ' ').slice(0, 120)}`);
        await expectRobustEnvelope(resp, `${ep} với payload ${c.name}`);
        // nghỉ ngắn giữa các request để không hammer server UAT
        await new Promise(r => setTimeout(r, 400));
      }
    });
  }
});