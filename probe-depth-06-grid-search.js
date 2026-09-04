const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/CategorySystem/Unit', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  const si = page.locator('input.search-input').first();
  await si.fill('TongCongTyKhongTonTaiXYZ');
  await si.press('Enter');
  await page.waitForTimeout(2500);
  const grid = page.locator('table:visible').nth(0);
  console.log('rows sau filter không khớp:', await grid.locator('tbody tr').count());
  const body = await page.locator('body').innerText();
  const m = body.match(/.{0,40}(no matching|không có|khong co|no result).{0,40}/i);
  console.log('text no-match:', m && m[0]);
  // clear
  await si.fill('');
  await si.press('Enter');
  await page.waitForTimeout(2000);
  console.log('rows sau clear:', await grid.locator('tbody tr').count());
  console.log('pagination items:', await page.locator('.pagination .page-item, .pagination li').count());
  await browser.close();
})();
