const { chromium } = require('@playwright/test');

// Probe: quan sát console error + pageerror trên 5 trang chính (không filter gì ngoài favicon/ảnh 404)
const PAGES = [
  '/Home/Index',
  '/ContractCar/Search',
  '/InsuranceFee/SearchPaymentFts',
  '/Report/HealthReport',
  '/ClaimGeneral/Search',
];

const BASE = 'https://uat-capdon.pjico.com.vn';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  // Kiểm tra session còn hợp lệ không
  await page.goto(BASE + '/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('load');
  console.log('URL Home/Index:', page.url());
  console.log('Login form visible (#EMAIL count):', await page.locator('#EMAIL').count());

  for (const path of PAGES) {
    const pageerrors = [];
    const consoleErrors = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', (e) => pageerrors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
      console.log('\n=== ' + path + ' — HTTP ' + (resp && resp.status()));
    } catch (e) {
      console.log('\n=== ' + path + ' — GOTO THẤT BẠI: ' + e.message.split('\n')[0]);
    }
    await page.waitForTimeout(3000);

    console.log('Final URL:', page.url());
    console.log('Login form visible (#EMAIL count):', await page.locator('#EMAIL').count());
    console.log('pageerrors (' + pageerrors.length + '):');
    pageerrors.forEach((e, i) => console.log('  PE' + i + ': ' + e.slice(0, 300)));
    console.log('console errors (' + consoleErrors.length + '):');
    consoleErrors.forEach((e, i) => console.log('  CE' + i + ': ' + e.replace(/\s+/g, ' ').slice(0, 400)));
  }

  await browser.close();
})();