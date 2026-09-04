// PROBE API 05 — BÁO CÁO CSSK + THANH TOÁN + QR — UAT PJICO
// Endpoints quan sát:
//  1) POST /InsuranceFee/PaymentFtsRegister (postData rỗng "") → catalog ma_bh — gọi trực tiếp được
//  2) POST /ContractPerson/FindNGRegister (payload mã hóa) — bắn khi load /Report/HealthReport
//  3) POST /QRCODEBase/BranchUnitQRCODESearch (payload mã hóa) — bắn khi load /Qrcode/SearchQrcode
//  4) GET /InsuranceFee/qrcode — trên /InsuranceFee/SearchPaymentFts, kỳ vọng ảnh QR
//     nhưng quan sát bị 302 → /ErrorHandler/Index (HTML lỗi thay vì ảnh)
//  5) Content-type audit: JSON endpoints trả nhãn text/html
const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = 'https://uat-capdon.pjico.com.vn';
const STATE = '.auth/uat.json';

function dumpJson(tag, obj) {
  try {
    const s = JSON.stringify(obj);
    console.log(`${tag} :: ${s.length > 1500 ? s.slice(0, 1500) + '…[cut]' : s}`);
  } catch (e) {
    console.log(`${tag} :: <không stringify được: ${e.message}>`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE, locale: 'vi-VN' });
  const page = await context.newPage();
  const out = {};

  // ============ (1) GỌI TRỰC TIẾP PaymentFtsRegister (catalog, postData rỗng) ============
  try {
    const resp = await context.request.post(BASE + '/InsuranceFee/PaymentFtsRegister', { data: '' });
    console.log('\n=== (1) POST /InsuranceFee/PaymentFtsRegister ===');
    console.log('status:', resp.status(), '| content-type:', resp.headers()['content-type']);
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { console.log('KHÔNG parse được JSON:', text.slice(0, 300)); }
    if (json) {
      dumpJson('body', json);
      out.pfts = {
        code: json.code,
        maBhType: Array.isArray(json.data && json.data.ma_bh) ? 'array' : typeof (json.data && json.data.ma_bh),
        maBhLen: json.data && json.data.ma_bh ? json.data.ma_bh.length : 0,
        first: json.data && json.data.ma_bh && json.data.ma_bh[0],
        keys: json.data && json.data.ma_bh && json.data.ma_bh[0] ? Object.keys(json.data.ma_bh[0]) : [],
      };
      console.log('ma_bh:', JSON.stringify(out.pfts));
    }
  } catch (e) {
    console.log('(1) LỖI:', e.message);
  }

  // ============ (2) /Report/HealthReport — bắt FindNGRegister khi load ============
  console.log('\n=== (2) GET /Report/HealthReport — FindNGRegister ===');
  try {
    const captured = [];
    page.on('response', async (r) => {
      if (r.url().includes('/ContractPerson/FindNGRegister')) {
        try {
          const j = await r.json();
          captured.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'], json: j });
        } catch (e) {
          captured.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'], parseErr: e.message });
        }
      }
    });
    const resp = await page.goto(BASE + '/Report/HealthReport', { timeout: 90000, waitUntil: 'domcontentloaded' });
    console.log('page status:', resp && resp.status(), '| title:', await page.title());
    // chờ request bắn (có thể bắn sau load một chút)
    await page.waitForTimeout(6000);
    if (captured.length === 0) {
      // thử bấm nút Tìm kiếm (read-only)
      console.log('FindNGRegister chưa bắn sau load — thử bấm nút Tìm kiếm…');
      const btn = page.getByRole('button', { name: /Tìm kiếm|Tìm/i }).first();
      if (await btn.count()) {
        await btn.click({ timeout: 15000 }).catch(e => console.log('click err:', e.message));
        await page.waitForTimeout(5000);
      } else {
        console.log('Không thấy nút Tìm kiếm trên trang');
      }
    }
    console.log('Số response FindNGRegister bắt được:', captured.length);
    captured.forEach((c, i) => {
      console.log(`  [${i}] status=${c.status} ct=${c.ct}`);
      dumpJson('  FindNGRegister body', c.json || c.parseErr);
    });
    out.findNG = captured.map(c => ({
      status: c.status, ct: c.ct, code: c.json && c.json.code,
      dviQly: c.json && c.json.data && c.json.data.dvi_qly ? c.json.data.dvi_qly : null,
    }));
    dumpJson('out.findNG', out.findNG);
  } catch (e) {
    console.log('(2) LỖI:', e.message);
  }

  // ============ (3) /Qrcode/SearchQrcode — bắt BranchUnitQRCODESearch khi load ============
  console.log('\n=== (3) GET /Qrcode/SearchQrcode — BranchUnitQRCODESearch ===');
  try {
    const captured = [];
    page.removeAllListeners('response');
    page.on('response', async (r) => {
      if (r.url().includes('/QRCODEBase/BranchUnitQRCODESearch')) {
        try {
          const j = await r.json();
          captured.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'], json: j });
        } catch (e) {
          captured.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'], parseErr: e.message });
        }
      }
    });
    const resp = await page.goto(BASE + '/Qrcode/SearchQrcode', { timeout: 90000, waitUntil: 'domcontentloaded' });
    console.log('page status:', resp && resp.status(), '| title:', await page.title());
    await page.waitForTimeout(6000);
    if (captured.length === 0) {
      console.log('BranchUnitQRCODESearch chưa bắn sau load — thử bấm nút Tìm…');
      const btn = page.getByRole('button', { name: /Tìm kiếm|Tìm/i }).first();
      if (await btn.count()) {
        await btn.click({ timeout: 15000 }).catch(e => console.log('click err:', e.message));
        await page.waitForTimeout(5000);
      } else {
        console.log('Không thấy nút Tìm kiếm trên trang');
      }
    }
    console.log('Số response BranchUnitQRCODESearch bắt được:', captured.length);
    captured.forEach((c, i) => {
      console.log(`  [${i}] status=${c.status} ct=${c.ct}`);
      dumpJson('  BranchUnitQRCODESearch body', c.json || c.parseErr);
    });
    out.branchUnit = captured.map(c => ({
      status: c.status, ct: c.ct, code: c.json && c.json.code,
      total: c.json && c.json.Total,
    }));
    dumpJson('out.branchUnit', out.branchUnit);
  } catch (e) {
    console.log('(3) LỖI:', e.message);
  }

  // ============ (4) /InsuranceFee/SearchPaymentFts — GET /InsuranceFee/qrcode ============
  console.log('\n=== (4) GET /InsuranceFee/SearchPaymentFts — QR image request ===');
  try {
    const captured = [];
    page.removeAllListeners('response');
    page.on('response', async (r) => {
      const u = r.url();
      if (/\/InsuranceFee\/qrcode/i.test(u)) {
        const req = r.request();
        captured.push({
          url: u, status: r.status(), ct: r.headers()['content-type'],
          location: r.headers()['location'] || null,
          isImg: !!(req.resourceType && (await req.resourceType()) === 'image') || /\.(png|jpg|jpeg|gif|svg)$/i.test(u) || /qrcode/i.test(u),
        });
      }
    });
    const resp = await page.goto(BASE + '/InsuranceFee/SearchPaymentFts', { timeout: 90000, waitUntil: 'domcontentloaded' });
    console.log('page status:', resp && resp.status(), '| title:', await page.title());
    await page.waitForTimeout(6000);
    console.log('Số response /InsuranceFee/qrcode bắt được:', captured.length);
    captured.forEach((c, i) => console.log(`  [${i}]`, JSON.stringify(c)));
    // thử cả request trực tiếp để xác nhận
    const direct = await context.request.get(BASE + '/InsuranceFee/qrcode', { maxRedirects: 0 });
    console.log('Direct GET /InsuranceFee/qrcode (no redirect):',
      'status=', direct.status(), '| ct=', direct.headers()['content-type'], '| location=', direct.headers()['location']);
    const directFollow = await context.request.get(BASE + '/InsuranceFee/qrcode');
    const body = await directFollow.text();
    console.log('Direct GET follow-redirect: status=', directFollow.status(), '| ct=', directFollow.headers()['content-type']);
    console.log('Body đầu (300 ký tự):', body.slice(0, 300).replace(/\n/g, ' '));
    console.log('Có chữ lỗi trong body?', /Lỗi|Error|Không tìm thấy|ExceptionHandler/i.test(body));
    out.qrcode = { captured, directStatus: direct.status(), directCT: direct.headers()['content-type'], followStatus: directFollow.status(), followCT: directFollow.headers()['content-type'] };
  } catch (e) {
    console.log('(4) LỖI:', e.message);
  }

  fs.writeFileSync('probe-api-05-result.json', JSON.stringify(out, null, 2));
  console.log('\nĐã lưu probe-api-05-result.json');
  await browser.close();
})();