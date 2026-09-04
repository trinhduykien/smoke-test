const { chromium } = require('@playwright/test');

// PROBE 08c — sau khi click button.pj-more-link "Hệ thống mã", DOM thay đổi thế nào?
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 300)));

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('load');
  await page.locator('.dropdown-toggle.name-menu--item').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);

  const more = page.locator('a.pj-more-toggle').first();
  await more.click();
  const panel = page.locator('.pj-menu-panel--more').first();
  await panel.waitFor({ state: 'visible', timeout: 10000 });

  // Chụp HTML panel TRƯỚC khi click more-link
  const htmlBefore = await panel.evaluate((el) => el.outerHTML);
  const bodyClassBefore = await page.evaluate(() => document.body.className);

  const heThongMa = panel.locator('button.pj-more-link').filter({ hasText: /Hệ thống mã/i }).first();
  await heThongMa.click();
  await page.waitForTimeout(1000);

  const htmlAfter = await panel.evaluate((el) => el.outerHTML).catch(() => '(panel không còn?)');
  console.log('panel visible sau click more-link:', await panel.isVisible().catch(() => '?'));
  console.log('body class trước:', JSON.stringify(bodyClassBefore));
  console.log('body class sau :', JSON.stringify(await page.evaluate(() => document.body.className)));

  if (htmlAfter !== '(panel không còn?)') {
    // So sánh độ dài + tìm phần khác biệt đầu tiên
    console.log('panel HTML len trước/sau:', htmlBefore.length, '/', htmlAfter.length);
    if (htmlBefore !== htmlAfter) {
      // in 1200 ký tự HTML sau
      console.log('panel HTML SAU (1400d):\n', htmlAfter.slice(0, 1400));
    } else {
      console.log('panel HTML KHÔNG đổi');
    }
  }

  // Có phần tử mới xuất hiện trong body? Tìm .pj-more-*, [class*=flyout], .pj-overflow
  for (const sel of ['.pj-overflow', '[class*=overflow]', '.pj-flyout', '.pj-more-sub', '.pj-more-back', '.pj-more-list']) {
    const loc = page.locator(sel);
    const c = await loc.count();
    if (c) console.log(`count ${sel}: ${c}, visible[0]: ${await loc.first().isVisible().catch(() => '?')}`);
  }

  // Menu "Hệ thống mã" toggle gốc (nằm tràn) — có hiện ra không?
  const htmToggle = page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: /Hệ thống mã/i })
    .first();
  console.log('toggle "Hệ thống mã" visible:', await htmToggle.isVisible().catch(() => '?'));
  const htmPanel = htmToggle
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
  console.log('panel gốc "Hệ thống mã" visible:', await htmPanel.isVisible().catch(() => '?'));

  // innerText panel sau click
  const pt = await panel.innerText().catch(() => '(err)');
  console.log('panel innerText sau click more-link:', JSON.stringify(pt.slice(0, 400)));

  await page.screenshot({ path: 'test-results/probe08c-after-morelink.png' }).catch(() => {});

  // URL có đổi không (click gây điều hướng?)
  console.log('URL:', page.url());

  console.log('errors:', JSON.stringify(errors.slice(0, 5)));
  await ctx.close();
  await browser.close();
})();