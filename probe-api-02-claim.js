// PROBE API 02-claim — phần 2: sửa URL ListRegisterOther, soi kỹ UI sau lỗi quyền, ClaimCargo HTTP chain
const { chromium } = require('@playwright/test');

const BASE = 'https://uat-capdon.pjico.com.vn';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', baseURL: BASE });
  const page = await ctx.newPage();

  // ============ 1. /ClaimPublic/ListRegisterOther với URL đầy đủ ============
  console.log('===== 1. POST /ClaimPublic/ListRegisterOther (URL đầy đủ) =====');
  try {
    const resp = await ctx.request.post(BASE + '/ClaimPublic/ListRegisterOther', { data: '' });
    console.log('HTTP status:', resp.status());
    console.log('Content-Type:', resp.headers()['content-type']);
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { console.log('JSON parse FAIL:', e.message); }
    if (json) {
      console.log('code:', json.code, '| message:', json.message);
      console.log('top-level keys:', Object.keys(json));
      if (json.data) {
        console.log('data keys:', Object.keys(json.data));
        for (const k of Object.keys(json.data)) {
          const v = json.data[k];
          console.log(`  data.${k}: type=${Array.isArray(v) ? 'array' : typeof v}, len=${Array.isArray(v) ? v.length : '-'}`);
          if (Array.isArray(v) && v.length) console.log(`    sample[0]:`, JSON.stringify(v[0]).slice(0, 200));
        }
      }
    }
  } catch (e) {
    console.log('ERROR:', (e.message || '').slice(0, 300));
  }

  // ============ 2. ClaimGeneral/Search — soi kỹ UI sau khi API trả code 400 ============
  console.log('\n===== 2. ClaimGeneral/Search — soi kỹ UI sau lỗi quyền =====');
  const onResp = [];
  page.on('response', r => { if (r.url().includes('/ClaimGeneral/') || r.url().includes('/ClaimPublic/')) onResp.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  await page.goto(BASE + '/ClaimGeneral/Search', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const btn = page.locator('button.btn-square.btn-p-input').first();
  const captured = page.waitForResponse(r => r.url().includes('/ClaimGeneral/ListSearch'), { timeout: 20000 })
    .then(r => r.text().then(t => ({ status: r.status(), body: t })));

  await btn.click();
  const apiResp = await captured;
  await page.waitForTimeout(4000);

  const ui = await page.evaluate(() => {
    const grid = document.querySelector('.k-grid');
    return {
      gridExists: !!grid,
      gridClasses: grid ? grid.className : '',
      gridInnerHtml: grid ? grid.innerHTML.slice(0, 600) : '',
      gridText: grid ? (grid.innerText || '').replace(/\s+/g, ' ').slice(0, 300) : '',
      // mọi text nổi bật trên trang sau khi click
      toasts: [...document.querySelectorAll('.toast, [class*=toast]')].map(t => (t.innerText || '').trim()).filter(Boolean),
      alertBoxes: [...document.querySelectorAll('.alert, #ErrorHandler, .sweet-alert, .swal2-container, [class*=message]')].map(t => (t.innerText || '').trim().replace(/\s+/g, ' ')).filter(t => t.length > 2).slice(0, 8),
      modalVisible: [...document.querySelectorAll('.modal.in')].map(m => (m.innerText || '').replace(/\s+/g, ' ').slice(0, 120)),
      // có phần tử nào chứa chữ "quyền" không?
      quyenText: (() => {
        const m = (document.body.innerText || '').match(/[^\n]*quy[eê]n[^\n]*/gi);
        return m ? m.slice(0, 5) : [];
      })(),
      loadingVisible: !!document.querySelector('.k-loading-color, .k-loading-mask'),
      fullBodyHasNoData: /kh[oô]ng c[oó] d[iy]li[eê]u/i.test(document.body.innerText || ''),
    };
  });
  console.log('API status:', apiResp.status, 'body:', apiResp.body.slice(0, 250));
  console.log('UI DETAIL:', JSON.stringify(ui, null, 1));
  console.log('Network /Claim* calls recorded:', onResp.slice(0, 20));

  // ============ 3. ClaimCargo/Search — HTTP chain ============
  console.log('\n===== 3. ClaimCargo/Search — HTTP chain =====');
  const chain = [];
  page.on('response', r => { if (r.url().includes('ClaimCargo')) chain.push(r.status() + ' ' + r.url().replace(BASE, '') + ' ct=' + r.headers()['content-type']); });
  try {
    const resp = await page.goto(BASE + '/ClaimCargo/Search', { timeout: 60000, waitUntil: 'domcontentloaded' });
    console.log('Main response status:', resp && resp.status());
    console.log('Final URL:', page.url());
    await page.waitForTimeout(2000);
    console.log('Chain:', chain);
    // Thử gọi trực tiếp endpoint catalog của ClaimCargo nếu có
    for (const ep of ['/ClaimCargo/ListSearch', '/ClaimPublic/ListRegisterOther']) {
      try {
        const r = await ctx.request.post(BASE + ep, { data: '' });
        const t = await r.text();
        console.log(`POST ${ep} (empty): HTTP ${r.status()} ct=${r.headers()['content-type']} body=${t.slice(0, 200)}`);
      } catch (e) { console.log(`POST ${ep} ERROR:`, e.message.slice(0, 150)); }
    }
  } catch (e) {
    console.log('ERROR:', (e.message || '').slice(0, 300));
  }

  await browser.close();
})();