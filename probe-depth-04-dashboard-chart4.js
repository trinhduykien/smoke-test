const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  let revenueResp = null;
  page.on('response', async r => {
    if (r.url().includes('GeneratedRevenue')) {
      try { revenueResp = { status: r.status(), body: (await r.text()).slice(0, 800) }; } catch (e) { revenueResp = { status: r.status() }; }
    }
  });

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await page.locator('#bar-chart-dt .highcharts-series').count() > 0) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1000);

  console.log('GeneratedRevenue response:', JSON.stringify(revenueResp, null, 1));

  // Dump text trong SVG
  const svgTexts = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    return Array.from(dt.querySelectorAll('svg text')).map(t => (t.textContent || '').trim()).filter(Boolean).slice(0, 40);
  });
  console.log('Tất cả text trong SVG:', JSON.stringify(svgTexts, null, 1));

  // Số điểm / cột
  const pointCount = await page.locator('#bar-chart-dt .highcharts-point').count();
  console.log('Số .highcharts-point:', pointCount);

  // Hover một cột bar → tooltip highcharts
  const bar = page.locator('#bar-chart-dt .highcharts-series rect, #bar-chart-dt .highcharts-series path').first();
  const barVisible = await bar.isVisible().catch(() => false);
  console.log('Bar đầu tiên visible:', barVisible);
  if (barVisible) {
    await bar.hover({ timeout: 15000 }).catch(e => console.log('hover lỗi:', String(e).slice(0, 150)));
    await page.waitForTimeout(800);
    const tooltipCount = await page.locator('#bar-chart-dt .highcharts-tooltip, .highcharts-tooltip').count();
    const tooltipText = tooltipCount > 0 ? await page.locator('.highcharts-tooltip').first().innerText().catch(() => '') : '';
    console.log('Tooltip count sau hover:', tooltipCount, '| text:', JSON.stringify((tooltipText || '').trim().slice(0, 300)));
  }

  // Chart có responsive redraw không: resize viewport
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(1200);
  const svgW2 = await page.evaluate(() => document.querySelector('#bar-chart-dt svg').getAttribute('width'));
  console.log('svg width sau resize 1200:', svgW2);

  await browser.close();
})();