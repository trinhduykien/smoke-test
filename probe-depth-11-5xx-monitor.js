// Probe: bắt các response 5xx/4xx ngầm khi load 5 trang pass của vòng smoke
const { chromium } = require('@playwright/test');

const BASE = 'https://uat-capdon.pjico.com.vn';
const PAGES = [
  '/ContractCar/Search',
  '/ClaimGeneral/Search',
  '/InsuranceFee/SearchPaymentFts',
  '/Report/HealthReport',
  '/Home/Index',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });
  const page = await ctx.newPage();

  for (const path of PAGES) {
    const failed = [];   // >= 500
    const bad4xx = [];   // >= 400 && < 500
    page.removeAllListeners('response');
    page.on('response', r => {
      const s = r.status();
      if (s >= 500) failed.push(s + ' ' + r.url());
      else if (s >= 400) bad4xx.push(s + ' ' + r.url());
    });

    console.log('=== ' + BASE + path + ' ===');
    try {
      await page.goto(BASE + path, { timeout: 90000, waitUntil: 'domcontentloaded' });
    } catch (e) {
      console.log('GOTO ERROR: ' + e.message.split('\n')[0]);
      continue;
    }
    // Đợi networkIdle tối đa 5s
    try { await page.waitForLoadState('networkidle', { timeout: 5000 }); }
    catch { console.log('(không đạt networkidle trong 5s — tiếp tục)'); }

    const isLogin = await page.locator('#EMAIL').count();
    console.log('URL hiện tại: ' + page.url());
    console.log('Có ô login (#EMAIL): ' + isLogin);
    console.log('5xx (' + failed.length + '): ' + (failed.join(' | ') || 'KHÔNG'));
    console.log('4xx (' + bad4xx.length + '): ' + (bad4xx.join(' | ') || 'KHÔNG'));
    console.log('');
  }

  await browser.close();
})();