const { chromium } = require('@playwright/test');

// PROBE — Responsive / mobile menu (viewport di động & tablet)
// Kiểm tra hành vi thật trước khi viết test:
//  1. Viewport 390x844 (mobile): menu top ẩn? #pjMobileMenuToggle hiện?
//     Click toggle → menu mobile mở? có mục "Cấp đơn"? scroll ngang?
//  2. Viewport 768x1024 (tablet): hành vi tương tự.

async function probeViewport(browser, width, height, label) {
  console.log(`\n========== VIEWPORT ${label} (${width}x${height}) ==========`);
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width, height },
  });
  const page = await ctx.newPage();

  const resp = await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('HTTP status:', resp && resp.status(), '| URL:', page.url());
  await page.waitForLoadState('load');

  // Session hết hạn?
  const emailCount = await page.locator('#EMAIL').count();
  console.log('#EMAIL count (login redirect?):', emailCount);

  // Các selector quan tâm
  for (const sel of [
    '#pjMobileMenuToggle',
    '.dropdown-toggle.name-menu--item',
    '.pj-top-item',
    '#pjMenuSearchToggle',
    '#pjUserMenuToggle',
    '#bar-chart-dt',
    '.navbar-toggle',
    '[class*=mobile]',
  ]) {
    const loc = page.locator(sel);
    console.log(`count ${sel}:`, await loc.count());
  }

  // Trạng thái hiển thị menu top (hover-menu desktop)
  const topToggle = page.locator('.dropdown-toggle.name-menu--item').first();
  if (await topToggle.count()) {
    console.log('top menu toggle visible:', await topToggle.isVisible());
  }

  // Scroll ngang?
  const hscroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
  );
  console.log('no horizontal scrollbar:', hscroll);
  const dims = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
  }));
  console.log('dims:', JSON.stringify(dims));

  // HTML của nút toggle mobile (nếu có) để biết text/aria
  const toggle = page.locator('#pjMobileMenuToggle');
  if ((await toggle.count()) > 0) {
    console.log('mobile toggle visible:', await toggle.isVisible());
    console.log('mobile toggle outerHTML:', (await toggle.evaluate(el => el.outerHTML)).slice(0, 500));
    console.log('mobile toggle text:', JSON.stringify(await toggle.innerText().catch(() => '')));

    // Trước khi bấm: menu mobile (nếu có container riêng) ẩn?
    // Thử các container khả năng
    for (const sel of ['.pj-mobile-menu', '#pjMobileMenu', '.mobile-menu', '.pj-menu-panel', '.sidebar', '#sidebar']) {
      const loc = page.locator(sel);
      const c = await loc.count();
      if (c) console.log(`before click — count ${sel}: ${c}, visible[0]: ${await loc.first().isVisible()}`);
    }

    // Bấm toggle mobile menu
    try {
      await toggle.click({ timeout: 15000 });
      await page.waitForTimeout(1200);
      console.log('clicked mobile toggle OK');
    } catch (e) {
      console.log('click mobile toggle FAILED:', e.message.split('\n')[0]);
    }

    // Sau khi bấm: những gì thay đổi
    for (const sel of ['.pj-mobile-menu', '#pjMobileMenu', '.mobile-menu', '.pj-menu-panel', '.navbar-collapse', '.profile-menu']) {
      const loc = page.locator(sel);
      const c = await loc.count();
      if (c) console.log(`after click — count ${sel}: ${c}, visible[0]: ${await loc.first().isVisible()}`);
    }

    // Tìm chữ "Cấp đơn" trong các phần tử đang hiển thị
    const capDonTexts = await page
      .getByText(/cấp đơn/i)
      .all()
      .catch(() => []);
    console.log('elements matching /cấp đơn/i:', capDonTexts.length);
    for (const el of capDonTexts.slice(0, 12)) {
      try {
        const visible = await el.isVisible();
        const tag = await el.evaluate(n => n.tagName + '.' + (n.className || '')).catch(() => '?');
        const txt = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 60);
        const box = await el.boundingBox();
        console.log(`  - visible=${visible} tag=${tag} text="${txt}" box=${box ? JSON.stringify(box) : 'null'}`);
      } catch {}
    }

    // Toggle mobile còn hiển thị / đổi trạng thái class?
    console.log('mobile toggle visible after click:', await toggle.isVisible());
    console.log('mobile toggle class after click:', await toggle.evaluate(el => el.className).catch(() => '?'));

    // Scroll ngang sau khi mở menu?
    const hscroll2 = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
    );
    console.log('no horizontal scrollbar AFTER open menu:', hscroll2);

    // Bấm lần 2 → đóng?
    try {
      await toggle.click({ timeout: 15000 });
      await page.waitForTimeout(800);
      console.log('second click (close?) done');
      for (const sel of ['.pj-menu-panel', '.mobile-menu']) {
        const loc = page.locator(sel);
        const c = await loc.count();
        if (c) console.log(`after 2nd click — ${sel} visible[0]: ${await loc.first().isVisible()}`);
      }
    } catch (e) {
      console.log('second click failed:', e.message.split('\n')[0]);
    }
  } else {
    console.log('>>> KHÔNG có #pjMobileMenuToggle ở viewport này');
  }

  // Ảnh chụp
  await page.screenshot({ path: `test-results/probe07-${label}.png`, fullPage: false }).catch(() => {});

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await probeViewport(browser, 390, 844, 'mobile-390');
  await probeViewport(browser, 768, 1024, 'tablet-768');
  await browser.close();
})();