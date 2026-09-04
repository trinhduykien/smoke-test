const { chromium } = require('@playwright/test');

/**
 * PROBE — Dashboard chart render thật (/Home/Index)
 * Mục tiêu:
 *  - Xác nhận #bar-chart-dt tồn tại và Highcharts vẽ SVG thật (highcharts-container, svg, .highcharts-series)
 *  - Đo timing: bao lâu sau load thì chart vẽ xong
 *  - Ghi lại các request AJAX liên quan chart (json/xmlHttpRequest)
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });
  const page = await ctx.newPage();

  const t0 = Date.now();
  const ajaxUrls = [];
  page.on('request', req => {
    const rt = req.resourceType();
    if (rt === 'xhr' || rt === 'fetch') {
      ajaxUrls.push(`${rt} ${req.method()} ${req.url()}`);
    }
  });
  const consoleErrors = [];
  page.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 300)));

  const resp = await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  console.log('HTTP status /Home/Index:', resp ? resp.status() : 'n/a');
  console.log('URL sau goto:', page.url());

  // Có bị đá về login không?
  const emailField = await page.locator('#EMAIL').count();
  console.log('#EMAIL count (login redirect?):', emailField);

  // Container chart
  const dtCount = await page.locator('#bar-chart-dt').count();
  console.log('#bar-chart-dt count:', dtCount);

  if (dtCount > 0) {
    const visible = await page.locator('#bar-chart-dt').first().isVisible().catch(() => false);
    console.log('#bar-chart-dt visible:', visible);
    const box = await page.locator('#bar-chart-dt').first().boundingBox().catch(() => null);
    console.log('#bar-chart-dt boundingBox:', JSON.stringify(box));

    // Đợi Highcharts vẽ thật — tối đa 30s
    let svgCount = 0, seriesCount = 0, containerCount = 0, drawnAt = -1;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      containerCount = await page.locator('#bar-chart-dt .highcharts-container').count();
      svgCount = await page.locator('#bar-chart-dt svg').count();
      seriesCount = await page.locator('#bar-chart-dt .highcharts-series').count();
      if (svgCount > 0 && seriesCount > 0) { drawnAt = Date.now() - t0; break; }
      await page.waitForTimeout(500);
    }
    console.log('highcharts-container count:', containerCount);
    console.log('svg count:', svgCount);
    console.log('highcharts-series count:', seriesCount);
    console.log('chart vẽ xong sau (ms, kể từ trước goto):', drawnAt);

    // Chi tiết series / điểm dữ liệu
    const seriesGroups = await page.locator('#bar-chart-dt .highcharts-series').count();
    const pointCount = await page.locator('#bar-chart-dt .highcharts-point').count();
    const axisLabels = await page.locator('#bar-chart-dt .highcharts-axis-labels').count();
    const legendCount = await page.locator('#bar-chart-dt .highcharts-legend').count();
    console.log('series groups:', seriesGroups, '| points:', pointCount, '| axis-labels:', axisLabels, '| legend:', legendCount);

    // Text của một vài nhãn axis (nếu có)
    if (axisLabels > 0) {
      const firstAxisText = await page.locator('#bar-chart-dt .highcharts-axis-labels').first().innerText().catch(() => '');
      console.log('axis-labels[0] text:', JSON.stringify(firstAxisText.slice(0, 200)));
    }

    // Title chart trong SVG
    const titleCount = await page.locator('#bar-chart-dt .highcharts-title').count();
    if (titleCount > 0) {
      const titleText = await page.locator('#bar-chart-dt .highcharts-title').first().innerText().catch(() => '');
      console.log('highcharts-title text:', JSON.stringify(titleText.trim()));
    }
  }

  // Các container chart khác trên dashboard (để biết bối cảnh)
  const otherCharts = await page.evaluate(() => {
    const ids = [];
    document.querySelectorAll('[id*="chart"], [class*="chart"]').forEach(el => {
      if (el.offsetParent !== null || el.id) ids.push(`${el.tagName}#${el.id}.${el.className}`.slice(0, 120));
    });
    return ids.slice(0, 40);
  });
  console.log('Các phần tử liên quan chart trên trang:', JSON.stringify(otherCharts, null, 1));

  // Đợi thêm 3s xem AJAX chart có chạy sau đó không
  await page.waitForTimeout(3000);
  console.log('--- AJAX requests (xhr/fetch) ---');
  console.log(ajaxUrls.slice(0, 30).join('\n') || '(không có)');
  console.log('--- Console errors ---');
  console.log(consoleErrors.slice(0, 10).join('\n') || '(không có)');

  await page.screenshot({ path: 'test-results/probe-depth-04-dashboard.png', fullPage: false });
  await browser.close();
})();