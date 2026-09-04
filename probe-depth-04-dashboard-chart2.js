const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  // Đợi chart vẽ
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await page.locator('#bar-chart-dt .highcharts-series').count() > 0) break;
    await page.waitForTimeout(500);
  }

  const info = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    const svg = dt ? dt.querySelector('svg') : null;
    const cont = dt ? dt.querySelector('.highcharts-container') : null;
    const cs = dt ? getComputedStyle(dt) : null;
    // tìm ancestor ẩn hoặc có height 0
    const chain = [];
    let el = dt;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      chain.push({
        tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).join('.') : ''),
        display: s.display, visibility: s.visibility,
        height: s.height, overflow: s.overflow,
        offsetHeight: el.offsetHeight, clientHeight: el.clientHeight,
      });
      el = el.parentElement;
    }
    return {
      dtFound: !!dt,
      dtAttrs: dt ? { style: dt.getAttribute('style'), cls: dt.className } : null,
      dtComputed: cs ? { display: cs.display, height: cs.height, visibility: cs.visibility } : null,
      svgSize: svg ? { w: svg.getAttribute('width'), h: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox'), offsetH: svg.offsetHeight, offsetW: svg.offsetWidth } : null,
      contSize: cont ? { offsetH: cont.offsetHeight, offsetW: cont.offsetWidth, styleH: cont.style.height } : null,
      chain: chain.slice(0, 12),
    };
  });
  console.log(JSON.stringify(info, null, 1));

  // svg boundingBox theo playwright
  const svgBox = await page.locator('#bar-chart-dt svg').first().boundingBox().catch(() => null);
  console.log('svg boundingBox:', JSON.stringify(svgBox));
  const visSvg = await page.locator('#bar-chart-dt svg').first().isVisible().catch(() => false);
  console.log('svg isVisible (playwright):', visSvg);
  const visSeries = await page.locator('#bar-chart-dt .highcharts-series').first().isVisible().catch(() => false);
  console.log('series isVisible (playwright):', visSeries);

  // Đợi thêm 5s xem container có được set height sau không (AJAX chậm)
  await page.waitForTimeout(5000);
  const dtBox2 = await page.locator('#bar-chart-dt').first().boundingBox().catch(() => null);
  console.log('#bar-chart-dt boundingBox sau 5s:', JSON.stringify(dtBox2));
  const visDt2 = await page.locator('#bar-chart-dt').isVisible().catch(() => false);
  console.log('#bar-chart-dt isVisible sau 5s:', visDt2);

  // Có tab nào để hiện chart không? Tìm tab/li/nav gần chart
  const tabs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[data-toggle="tab"], .nav-tabs a, li[data-toggle], [role="tab"]').forEach(el => {
      out.push({ text: (el.innerText || '').trim().slice(0, 50), href: el.getAttribute('href'), visible: el.offsetParent !== null });
    });
    return out;
  });
  console.log('Tabs trên trang:', JSON.stringify(tabs, null, 1));

  await page.screenshot({ path: 'test-results/probe-depth-04-dashboard-2.png', fullPage: false });
  await browser.close();
})();