// Trinh sát các endpoint AJAX của app UAT: mở trang + bấm nút Tìm kiếm, ghi lại mọi XHR/fetch
const { chromium } = require('@playwright/test');

const PAGES = [
  { url: '/Home/Index', clickSearch: null },
  { url: '/ContractCar/Search', clickSearch: 'button.btn-blue' },
  { url: '/ClaimGeneral/Search', clickSearch: 'button.btn-square.btn-p-input' },
  { url: '/InsuranceFee/SearchPaymentFts', clickSearch: null },
  { url: '/Report/HealthReport', clickSearch: 'button.btn-filter-update, .btn-submit, button:has-text("Xem báo cáo"), a.btn:has-text("Xem")' },
  { url: '/CategorySystem/Unit', clickSearch: null },
  { url: '/Qrcode/SearchQrcode', clickSearch: null },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });

  for (const p of PAGES) {
    const page = await ctx.newPage();
    const hits = [];
    page.on('response', async r => {
      try {
        const req = r.request();
        const rt = req.resourceType();
        if (!['xhr', 'fetch'].includes(rt)) return;
        const headers = await r.allHeaders();
        const ct = headers['content-type'] || '';
        if (!ct.includes('json') && !ct.includes('javascript')) return;
        let preview = '';
        if (ct.includes('json')) {
          const body = await r.text().catch(() => '');
          preview = body.replace(/\s+/g, ' ').slice(0, 220);
        }
        hits.push({ method: req.method(), url: r.url().replace('https://uat-capdon.pjico.com.vn', ''), status: r.status(), ct: ct.split(';')[0], body: preview });
      } catch {}
    });

    try {
      await page.goto('https://uat-capdon.pjico.com.vn' + p.url, { timeout: 90000, waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);

      if (p.clickSearch) {
        for (const sel of p.clickSearch.split(', ')) {
          const btn = page.locator(sel).first();
          if (await btn.isVisible().catch(() => false)) {
            await btn.click().catch(() => {});
            await page.waitForTimeout(3000);
            console.log(`   [đã bấm nút tìm với selector: ${sel}]`);
            break;
          }
        }
      }
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log(`LỖI ${p.url}: ${e.message.slice(0, 100)}`);
    }

    console.log(`\n========== ${p.url} — ${hits.length} XHR/fetch JSON ==========`);
    const seen = new Set();
    for (const h of hits) {
      const key = h.method + ' ' + h.url.split('?')[0];
      if (seen.has(key)) continue; seen.add(key);
      console.log(`${h.method} ${h.url} → ${h.status} [${h.ct}]`);
      if (h.body) console.log(`   body: ${h.body}`);
    }
    await page.close();
  }
  await browser.close();
})();