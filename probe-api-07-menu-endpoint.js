// Probe 07 — API menu fragment /khud/MenuRegister + audit toàn bộ envelope
// (1) Mở 3 trang, bắt response /khud/MenuRegister trên mỗi trang → status + nội dung menu
// (2) Gọi trực tiếp GET /khud/MenuRegister qua context.request.get (giữ cookies)
// (3) Gọi 4 endpoint catalog (POST body rỗng) → audit envelope code/message/systemMessage/data
const { chromium } = require('@playwright/test');

const BASE = 'https://uat-capdon.pjico.com.vn';
const PAGES = ['/Home/Index', '/ContractCar/Search', '/CategorySystem/Unit'];

const MAIN_MENUS = ['Cấp đơn', 'Thanh toán', 'Bồi thường', 'Tái bảo hiểm', 'Tiện ích'];

const CATALOG_ENDPOINTS = [
  '/ContractCar/RegisterSearch',
  '/ClaimPublic/ListRegisterOther',
  '/InsuranceFee/PaymentFtsRegister',
  '/CategorySystem/UnitRegister',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });

  // ========== (1) MenuRegister trên 3 trang ==========
  for (const path of PAGES) {
    const page = await ctx.newPage();
    try {
      console.log(`\n===== TRANG ${path} =====`);
      const respPromise = page.waitForResponse(r => r.url().includes('/khud/MenuRegister'), { timeout: 60000 });
      await page.goto(BASE + path, { timeout: 90000, waitUntil: 'domcontentloaded' });
      const resp = await respPromise;
      const status = resp.status();
      let body = '';
      try { body = await resp.text(); } catch { body = '<không đọc được body>'; }
      console.log(`  MenuRegister → HTTP ${status} | content-type: ${(resp.headers()['content-type'] || '(trống)')}`);
      console.log(`  body length: ${body.length} | 150 ký tự đầu: ${body.replace(/\s+/g, ' ').slice(0, 150)}`);
      const lower = body.toLowerCase();
      for (const m of MAIN_MENUS) {
        console.log(`  menu "${m}": ${lower.includes(m.toLowerCase()) ? 'CÓ' : 'KHÔNG'}`);
      }
      console.log(`  user "TRINH DUY KIEN": ${body.toUpperCase().includes('TRINH DUY KIEN') ? 'CÓ' : 'KHÔNG'}`);
      // xem các chuỗi giống tên user
      const userMatches = body.match(/TRINH[^<"]{0,30}/gi) || [];
      console.log(`  chuỗi giống tên user (TRINH...): ${JSON.stringify(userMatches.slice(0, 5))}`);
      const kiem = body.match(/KI[EẾ][NND][^<"]{0,20}/gi) || [];
      console.log(`  chuỗi KIEN...: ${JSON.stringify(kiem.slice(0, 5))}`);
    } catch (e) {
      console.log(`  NGOẠI LỆ: ${e.message.slice(0, 200)}`);
    }
    await page.close();
  }

  // ========== (2) Gọi trực tiếp GET /khud/MenuRegister ==========
  console.log(`\n===== GET TRỰC TIẾP /khud/MenuRegister =====`);
  try {
    const resp = await ctx.request.get(BASE + '/khud/MenuRegister', { timeout: 30000 });
    const status = resp.status();
    let body = '';
    try { body = await resp.text(); } catch { body = '<không đọc được body>'; }
    console.log(`  → HTTP ${status} | content-type: ${(resp.headers()['content-type'] || '(trống)')}`);
    console.log(`  body length: ${body.length} | 200 ký tự đầu: ${body.replace(/\s+/g, ' ').slice(0, 200)}`);
    const lower = body.toLowerCase();
    for (const m of MAIN_MENUS) {
      console.log(`  menu "${m}": ${lower.includes(m.toLowerCase()) ? 'CÓ' : 'KHÔNG'}`);
    }
    console.log(`  user "TRINH DUY KIEN": ${body.toUpperCase().includes('TRINH DUY KIEN') ? 'CÓ' : 'KHÔNG'}`);
  } catch (e) {
    console.log(`  NGOẠI LỆ: ${e.message.slice(0, 200)}`);
  }

  // ========== (3) Audit envelope 4 endpoint catalog ==========
  for (const ep of CATALOG_ENDPOINTS) {
    console.log(`\n===== POST ${ep} (body rỗng như app) =====`);
    try {
      const resp = await ctx.request.post(BASE + ep, {
        data: '',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
        timeout: 30000,
      });
      const status = resp.status();
      const ct = (resp.headers()['content-type'] || '').split(';')[0].trim();
      let body = '';
      try { body = await resp.text(); } catch { body = '<không đọc được body>'; }
      let j = null, jsonOk = false;
      try { j = JSON.parse(body); jsonOk = true; } catch {}
      console.log(`  → HTTP ${status} | content-type: ${ct || '(trống)'}`);
      console.log(`  → JSON parse: ${jsonOk}`);
      if (jsonOk && j && typeof j === 'object') {
        const keys = Object.keys(j);
        console.log(`  → keys envelope: ${JSON.stringify(keys)}`);
        for (const k of ['code', 'message', 'systemMessage', 'data']) {
          console.log(`  → "${k}": ${keys.includes(k) ? 'CÓ' : 'THIẾU'}${keys.includes(k) ? ` (giá trị: ${String(JSON.stringify(j[k])).slice(0, 80)})` : ''}`);
        }
      } else {
        console.log(`  → body 250 ký tự đầu: ${body.replace(/\s+/g, ' ').slice(0, 250)}`);
      }
    } catch (e) {
      console.log(`  NGOẠI LỆ: ${e.message.slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
})();