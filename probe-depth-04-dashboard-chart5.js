const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await page.locator('#bar-chart-dt .highcharts-series').count() > 0) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);

  const stateBefore = await page.evaluate(() => {
    const t = document.querySelector('.highcharts-tooltip');
    return t ? { opacity: t.getAttribute('opacity'), visibility: t.getAttribute('visibility'), text: (t.textContent || '').trim() } : null;
  });
  console.log('Tooltip TRƯỚC hover:', JSON.stringify(stateBefore));

  await page.locator('#bar-chart-dt .highcharts-series rect, #bar-chart-dt .highcharts-series path').first().hover();
  await page.waitForTimeout(1000);
  const stateAfter = await page.evaluate(() => {
    const tips = Array.from(document.querySelectorAll('.highcharts-tooltip')).map(t => ({
      opacity: t.getAttribute('opacity'), visibility: t.getAttribute('visibility'),
      text: (t.textContent || '').trim().slice(0, 300),
    }));
    return tips;
  });
  console.log('Tooltip SAU hover:', JSON.stringify(stateAfter, null, 1));

  await browser.close();
})();