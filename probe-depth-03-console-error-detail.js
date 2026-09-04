const { chromium } = require('@playwright/test');
const BASE = 'https://uat-capdon.pjico.com.vn';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  // Chạy 3 lần để xác nhận lỗi ổn định (không flaky)
  for (let run = 1; run <= 3; run++) {
    const errors = [];
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    await page.goto(BASE + '/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    console.log('Run ' + run + ' — errors: ' + errors.length);
    errors.forEach((e, i) => console.log('  E' + i + ': ' + e.replace(/\s+/g, ' ').slice(0, 300)));
  }

  // Tìm nguồn script lỗi trong DOM
  const scripts = await page.$$eval('script[src]', (els) =>
    els.map((el) => el.getAttribute('src')).filter((s) => s && /ErrorHandler|error/i.test(s))
  );
  console.log('Script src khớp error trong DOM:', JSON.stringify(scripts));

  // Thấy request nào trả về MIME sai
  const failed = [];
  page.on('response', (r) => {
    if (r.url().includes('ErrorHandler')) {
      console.log('RESPONSE ErrorHandler:', r.url(), 'status=' + r.status(), 'ct=' + (r.headers()['content-type'] || ''));
    }
  });
  page.on('requestfailed', (r) => failed.push(r.url() + ' — ' + (r.failure() && r.failure().errorText)));
  await page.goto(BASE + '/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  console.log('Requests failed (' + failed.length + '):');
  failed.forEach((f) => console.log('  ' + f));

  await browser.close();
})();