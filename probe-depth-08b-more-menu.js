const { chromium } = require('@playwright/test');

// PROBE 08b — hành vi click button.pj-more-link trong panel THÊM (mở submenu tràn)
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('load');
  await page.locator('.dropdown-toggle.name-menu--item').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);

  const more = page.locator('a.pj-more-toggle').first();
  console.log('aria-expanded trước click:', await more.getAttribute('aria-expanded'));
  await more.click();
  const panel = page.locator('.pj-menu-panel--more').first();
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  console.log('aria-expanded sau click:', await more.getAttribute('aria-expanded'));

  const moreLinks = panel.locator('button.pj-more-link');
  console.log('số button.pj-more-link:', await moreLinks.count());
  const labels = await moreLinks.allInnerTexts();
  console.log('labels:', JSON.stringify(labels.map((t) => t.replace(/\s+/g, ' ').trim())));

  // Bấm "Hệ thống mã" — submenu tràn hiện ra thế nào?
  const heThongMa = moreLinks.filter({ hasText: /Hệ thống mã/i }).first();
  await heThongMa.click();
  await page.waitForTimeout(800);
  // Tìm phần tử pj-overflow
  const ovCount = await page.locator('[id^=pj-overflow]').count();
  console.log('count [id^=pj-overflow]:', ovCount);
  for (let i = 0; i < ovCount; i++) {
    const el = page.locator('[id^=pj-overflow]').nth(i);
    const id = await el.getAttribute('id');
    const vis = await el.isVisible();
    const cls = await el.evaluate((n) => n.className);
    console.log(`  #${id}: visible=${vis} cls="${cls}"`);
    if (vis) {
      const links = await el.locator('a').allInnerTexts().catch(() => []);
      console.log(`  #${id} links:`, JSON.stringify(links.map((t) => t.trim()).slice(0, 10)));
    }
  }
  await page.screenshot({ path: 'test-results/probe08b-submenu.png' }).catch(() => {});

  // Đếm tổng a trong nav trước/sau khi mở submenu
  const total = await page.evaluate(() => {
    const seen = new Set();
    let n = 0;
    document.querySelectorAll('nav a, .menu a').forEach((a) => {
      if (!seen.has(a)) {
        seen.add(a);
        n++;
      }
    });
    return n;
  });
  console.log('TỔNG a trong nav khi submenu tràn đang mở:', total);

  // Đóng mọi thứ: Escape trước, rồi click more-toggle
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  console.log('sau Escape: panel visible?', await panel.isVisible().catch(() => '?'));
  console.log('sau Escape: submenu visible?', await page.locator('[id^=pj-overflow]').first().isVisible().catch(() => '?'));

  await more.click().catch(() => {});
  await page.waitForTimeout(500);
  console.log('sau click more lần nữa: panel visible?', await panel.isVisible().catch(() => '?'));

  console.log('errors:', JSON.stringify(errors.slice(0, 5)));
  await ctx.close();
  await browser.close();
})();