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

  // Chi tiết nội dung chart: axis labels, legend, tooltip data
  const chartDetail = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    if (!dt) return null;
    const texts = sel => Array.from(dt.querySelectorAll(sel)).map(e => (e.textContent || '').trim()).filter(Boolean).slice(0, 20);
    return {
      axisYLabels: texts('.highcharts-yaxis .highcharts-axis-labels text'),
      axisXLabels: texts('.highcharts-xaxis .highcharts-axis-labels text'),
      legendItems: texts('.highcharts-legend-item text'),
      seriesNames: texts('.highcharts-legend .highcharts-series'),
      svgTitle: (dt.querySelector('.highcharts-title') || {}).textContent || '',
    };
  });
  console.log('Chart detail:', JSON.stringify(chartDetail, null, 1));

  // Các tab trong tab-slider + chart container của từng tab
  const layout = await page.evaluate(() => {
    const containers = document.querySelectorAll('.tab-slider--container > div[id^="tab"], .container-fluid.tab-slider--container > div');
    const tabInfo = [];
    const seen = new Set();
    document.querySelectorAll('.tab-slider--container > div').forEach(d => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      tabInfo.push({
        id: d.id,
        cls: d.className,
        visible: d.offsetParent !== null,
        offsetH: d.offsetHeight,
        charts: Array.from(d.querySelectorAll('[id*="chart"]')).map(c => c.id),
      });
    });
    // tab-slider nav controls
    const navs = Array.from(document.querySelectorAll('.tab-slider--nav a, .tab-slider--nav button, .nav-tabs--slider a, a[href^="#tab"]')).map(a => ({
      text: (a.innerText || '').trim().slice(0, 60), href: a.getAttribute('href'), visible: a.offsetParent !== null,
    }));
    return { tabInfo, navs };
  });
  console.log('Tabs & charts:', JSON.stringify(layout, null, 1));

  // Highcharts tổng số chart trên trang
  const totalCharts = await page.evaluate(() => document.querySelectorAll('.highcharts-container').length);
  console.log('Tổng .highcharts-container trên trang:', totalCharts);
  const ids = await page.evaluate(() => Array.from(document.querySelectorAll('div[id*="chart"]')).map(e => ({ id: e.id, hasSvg: !!e.querySelector('svg'), visible: e.offsetParent !== null })));
  console.log('Tất cả div[id*=chart]:', JSON.stringify(ids, null, 1));

  await browser.close();
})();