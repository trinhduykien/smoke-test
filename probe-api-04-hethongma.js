/**
 * PROBE API 04 (v2) — làm rõ: UnitRegister schema (gọi trực tiếp bằng full URL),
 * cấu trúc chuỗi data UnitSearch (67 phần tử khi split ';' — tất cả là bản ghi?),
 * khớp 10 bản ghi đầu với grid trang 1, khớp số page = ceil(n/10) với 7 số trang + prev/next = 9 page-item.
 */
const { chromium } = require('@playwright/test');
const BASE = 'https://uat-capdon.pjico.com.vn';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });

  // ---------- (1) UnitRegister full URL ----------
  console.log('===== (1) POST /CategorySystem/UnitRegister (full URL, data rỗng) =====');
  try {
    const resp = await ctx.request.post(BASE + '/CategorySystem/UnitRegister', { data: '', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    console.log('status:', resp.status(), '| content-type:', resp.headers()['content-type']);
    const text = await resp.text();
    console.log('RAW (600 đầu):', text.slice(0, 600));
    try {
      const json = JSON.parse(text);
      console.log('code:', json.code, '| message:', json.message, '| keys:', Object.keys(json));
      const d = json.data;
      console.log('typeof data:', typeof d, Array.isArray(d) ? 'array' : '');
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        for (const k of Object.keys(d)) {
          const v = d[k];
          if (Array.isArray(v)) console.log(`  data.${k}: array[${v.length}] sample:`, JSON.stringify(v[0]));
          else console.log(`  data.${k}:`, JSON.stringify(v).slice(0, 150));
        }
      }
    } catch (e) { console.log('KHÔNG phải JSON:', (e.message || '').slice(0, 120)); }
  } catch (e) {
    console.log('UnitRegister ERROR:', (e.message || '').slice(0, 300));
  }

  // thử lại với data JSON rỗng
  try {
    const resp = await ctx.request.post(BASE + '/CategorySystem/UnitRegister', { data: '' });
    console.log('v2 status:', resp.status());
  } catch (e) { console.log('v2 err:', (e.message || '').slice(0, 150)); }

  // ---------- (2) Trang Unit: xác minh chi tiết data vs grid ----------
  console.log('\n===== (2) /CategorySystem/Unit — xác minh data vs grid =====');
  const page = await ctx.newPage();
  let searchJson = null, searchCT = null;
  page.on('response', async (r) => {
    if (r.url().includes('/CategorySystem/UnitSearch')) {
      try {
        searchCT = r.headers()['content-type'];
        searchJson = JSON.parse(await r.text());
      } catch (e) {}
    }
  });
  await page.goto(BASE + '/CategorySystem/Unit', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  if (!searchJson) {
    console.log('!! chưa có UnitSearch — bấm Enter vào ô #MA');
    await page.locator('#MA').press('Enter').catch(async () => {
      const inp = page.locator('input[type=text]').nth(1);
      await inp.click(); await inp.press('Enter');
    });
    await page.waitForTimeout(5000);
  }

  console.log('UnitSearch content-type:', searchCT, '| code:', searchJson && searchJson.code);
  const s = String(searchJson && searchJson.data || '');
  const lines = s.split(';').filter(x => x.length > 0);
  console.log('tổng phần tử split ; :', lines.length);
  const badLines = [];
  lines.forEach((ln, i) => {
    const cols = ln.split('|');
    if (cols.length < 2) badLines.push({ i, ln: ln.slice(0, 80) });
  });
  console.log('số line có < 2 cột:', badLines.length, JSON.stringify(badLines.slice(0, 5)));
  const colCounts = {};
  lines.forEach(ln => { const n = ln.split('|').length; colCounts[n] = (colCounts[n] || 0) + 1; });
  console.log('phân bố số cột mỗi line:', JSON.stringify(colCounts));
  // kiểm tra data có kết thúc bằng ';' hoặc phần tử tổng?
  console.log('data cuối (120 ký tự):', JSON.stringify(s.slice(-120)));

  // grid: 10 hàng đầu của data có khớp grid trang 1?
  const grid = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table')].filter(t => {
      const st = getComputedStyle(t), r = t.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && t.querySelectorAll('tbody tr').length > 0;
    })[0];
    if (!rows) return null;
    return [...rows.querySelectorAll('tbody tr')].map(tr => (tr.innerText || '').replace(/\s+/g, ' ').trim());
  });
  console.log('grid rows:', grid && grid.length);
  if (grid) grid.slice(0, 3).forEach((g, i) => console.log(`  grid[${i}]:`, g.slice(0, 120)));
  console.log('data line[0]:', lines[0]);
  console.log('data line[1]:', lines[1]);
  const dataPage1 = lines.slice(0, 10).map(ln => ln.split('|')[0]);
  console.log('MA của 10 bản ghi đầu data:', JSON.stringify(dataPage1));
  const gridMas = grid ? grid.map(g => g.split(/\s+/)[0]) : [];
  console.log('MA (cột đầu) của 10 hàng grid:', JSON.stringify(gridMas));

  const pageItemCount = await page.evaluate(() => document.querySelectorAll('.page-item').length);
  const numberedPages = await page.evaluate(() => [...document.querySelectorAll('.page-item')].map(p => (p.innerText || '').trim()).filter(t => /^\d+$/.test(t)).length);
  console.log('page-item tổng:', pageItemCount, '| số trang đánh số:', numberedPages, '| kỳ vọng theo data: Math.ceil(' + lines.length + '/10) =', Math.ceil(lines.length / 10));

  await browser.close();
})();