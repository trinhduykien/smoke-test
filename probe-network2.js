// Probe v2: bắt MỌI request về server kèm body preview (bỏ qua static), có bấm nút tìm kiếm
const { chromium } = require('@playwright/test');

const PAGES = [
  { url: '/Home/Index', clickSearch: null },
  { url: '/ContractCar/Search', clickSearch: ['button.btn-blue'] },
  { url: '/ClaimGeneral/Search', clickSearch: ['button.btn-square.btn-p-input'] },
  { url: '/CategorySystem/Unit', clickSearch: null },
  { url: '/Report/HealthReport', clickSearch: ['button.btn-filter-update'] },
  { url: '/InsuranceFee/SearchPaymentFts', clickSearch: null },
  { url: '/Qrcode/SearchQrcode', clickSearch: null },
  { url: '/ContractPublic/BrowserSearch', clickSearch: null },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });

  for (const p of PAGES) {
    const page = await ctx.newPage();
    const hits = [];
    page.on('response', async r => {
      try {
        const url = r.url();
        if (!url.includes('capdon.pjico.com.vn')) return;
        if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)(\?|$)/i.test(url)) return;
        const req = r.request();
        const headers = await r.allHeaders().catch(() => ({}));
        const ct = (headers['content-type'] || '').split(';')[0].trim();
        let preview = '';
        if ((ct.includes('html') || ct.includes('json')) && r.status() < 400) {
          const body = await r.text().catch(() => '');
          const clean = body.replace(/\s+/g, ' ');
          // nếu là HTML, chỉ lấy text chính
          preview = ct.includes('json') ? clean.slice(0, 250)
            : clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 150);
        }
        hits.push({ rt: req.resourceType(), method: req.method(), url: url.replace('https://uat-capdon.pjico.com.vn', ''), status: r.status(), ct, preview, postData: req.postData() || '' });
      } catch {}
    });

    try {
      await page.goto('https://uat-capdon.pjico.com.vn' + p.url, { timeout: 90000, waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);

      if (p.clickSearch) {
        for (const sel of p.clickSearch) {
          const btn = page.locator(sel).first();
          if (await btn.isVisible().catch(() => false)) {
            await btn.click().catch(() => {});
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.waitForTimeout(2500);
            hits.push({ marker: '>>> SAU KHI BẤM NÚT: ' + sel });
            break;
          }
        }
      }
    } catch (e) {
      console.log(`LỖI ${p.url}: ${e.message.slice(0, 100)}`);
    }

    console.log(`\n========== ${p.url} ==========`);
    const seen = new Set();
    for (const h of hits) {
      if (h.marker) { console.log(h.marker); continue; }
      const k = h.method + ' ' + h.url.split('?')[0];
      if (seen.has(k)) continue; seen.add(k);
      console.log(`[${h.rt}] ${h.method} ${h.url} → ${h.status} [${h.ct}]`);
      if (h.postData) console.log(`   POST data: ${h.postData.slice(0, 180)}`);
      if (h.preview) console.log(`   body: ${h.preview}`);
    }
    await page.close();
  }
  await browser.close();
})();