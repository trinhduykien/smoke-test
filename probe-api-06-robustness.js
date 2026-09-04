// Probe 06 — API robustness: gửi payload xấu (định dạng sai, KHÔNG phải SQL/XSS) vào
// 5 endpoint catalog read-only, mỗi case đúng 1 request, ghi nhận status + body thật.
const { chromium } = require('@playwright/test');

const BASE = 'https://uat-capdon.pjico.com.vn';

// Endpoint catalog/read-only — postData bình thường là chuỗi rỗng ""
const ENDPOINTS = [
  '/ContractCar/RegisterSearch',
  '/ContractPublic/BrowserRegister',
  '/ClaimPublic/ListRegisterOther',
  '/InsuranceFee/PaymentFtsRegister',
  '/CategorySystem/UnitRegister',
];

// Các case payload xấu (chỉ sai ĐỊNH DẠNG, không chứa SQL/XSS)
const CASES = [
  { name: 'baseline (body rỗng như app)', data: '' },
  { name: 'body rỗng "" (a)', data: '' , raw: true },
  { name: 'JSON sai định dạng {"data":12345} (b)', data: '{"data":12345}' },
  { name: 'text thuần garbage-not-json (c)', data: 'garbage-not-json' },
  { name: 'JSON hợp lệ, data mã hóa rác (d)', data: '{"data":"@@@not-valid-base64@@@","cot":"ma"}' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });

  for (const ep of ENDPOINTS) {
    console.log(`\n===== ${ep} =====`);
    for (const c of CASES) {
      try {
        const resp = await ctx.request.post(BASE + ep, {
          data: c.data,
          headers: {
            // app tự gọi fetch với content-type kiểu form/text — thử như app hay gửi
            'content-type': 'application/x-www-form-urlencoded',
            'x-requested-with': 'XMLHttpRequest',
          },
          timeout: 30000,
        });
        const status = resp.status();
        const headers = await Promise.resolve(resp.headers()).catch(() => ({}));
        const ct = (headers['content-type'] || '').split(';')[0].trim();
        let body = '';
        try { body = await resp.text(); } catch { body = '<không đọc được body>'; }
        const bodyTrim = body.replace(/\s+/g, ' ').slice(0, 220);
        let jsonOk = false, code = '';
        try { const j = JSON.parse(body); jsonOk = true; code = j && j.code !== undefined ? String(j.code) : '(không có code)'; } catch {}
        console.log(`[${c.name}]`);
        console.log(`  → HTTP ${status} | content-type: ${ct || '(trống)'}`);
        console.log(`  → JSON parse: ${jsonOk}${code ? ' | code: ' + code : ''} | body bắt đầu '{': ${body.trimStart().startsWith('{')}`);
        console.log(`  → body: ${bodyTrim}`);
        console.log(`  → KỲ VỌNG (<500 + JSON envelope): ${status < 500 && (jsonOk || body.trimStart().startsWith('{')) ? 'ĐẠT' : 'LỖI ROBUSTNESS'}`);
      } catch (e) {
        console.log(`[${c.name}] → NGOẠI LỆ: ${e.message.slice(0, 150)}`);
      }
      // không hammer — nghỉ ngắn giữa các request
      await new Promise(r => setTimeout(r, 500));
    }
  }
  await browser.close();
})();