const { chromium } = require('@playwright/test');

/**
 * PROBE — Menu "THÊM" (overflow) — vòng depth 08-more-menu
 * Viewport 1280x900 → goto /Home/Index → một số mục menu tràn vào "THÊM" (a.pj-more-toggle).
 * Cần tìm hiểu hành vi thật:
 *  1. Ở 1280x900, .pj-more-toggle có hiện không? Bao nhiêu menu cha hiển thị trực tiếp?
 *  2. Cấu trúc DOM quanh .pj-more-toggle (panel ở đâu, class gì)?
 *  3. Click .pj-more-toggle → panel hiện gì? Bao nhiêu mục?
 *  4. Đếm tổng số link menu trước/sau khi mở panel — có mục nào "mất" không?
 *  5. Click lần 2 → đóng panel? (giống search toggle?)
 *  6. So sánh với viewport 1600x900 (đầy menu, không THÊM?) để đối chiếu.
 */

const BASE = 'https://uat-capdon.pjico.com.vn';
const HOME = BASE + '/Home/Index';

// Đếm tất cả <a> trong nav menu top (cả hiển thị lẫn ẩn trong DOM)
async function countNavLinks(page) {
  return page.evaluate(() => {
    const navs = document.querySelectorAll('nav, .menu');
    const seen = new Set();
    let total = 0;
    const items = [];
    navs.forEach((nav) => {
      nav.querySelectorAll('a').forEach((a) => {
        if (!seen.has(a)) {
          seen.add(a);
          total++;
          items.push({
            text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
            href: a.getAttribute('href'),
            cls: (a.className || '').slice(0, 60),
            visible: !!(a.offsetWidth || a.offsetHeight || a.getClientRects().length),
          });
        }
      });
    });
    return { total, items };
  });
}

async function probeViewport(browser, width, height, label) {
  console.log(`\n========== VIEWPORT ${label} (${width}x${height}) ==========`);
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width, height },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200));
  });

  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('HTTP status:', resp && resp.status(), '| URL:', page.url());
  await page.waitForLoadState('load');

  if ((await page.locator('#EMAIL').count()) > 0) {
    console.log('!! SESSION HẾT HẠN — thấy #EMAIL login redirect');
    await ctx.close();
    return;
  }

  // Menu top bar render bằng JS sau khi trang load — chờ toggle đầu tiên xuất hiện
  try {
    await page
      .locator('.dropdown-toggle.name-menu--item')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    console.log('!! menu top KHÔNG xuất hiện sau 30s');
  }
  await page.waitForTimeout(1500); // chờ JS gắn overflow "THÊM" (có thể chạy sau render menu)

  // --- Trước khi mở THÊM ---
  const before = await countNavLinks(page);
  console.log('TỔNG <a> trong nav (trước):', before.total);

  const moreToggle = page.locator('a.pj-more-toggle');
  const moreCount = await moreToggle.count();
  console.log('a.pj-more-toggle count:', moreCount);
  if (moreCount === 0) {
    console.log('>>> KHÔNG có nút THÊM ở viewport này (menu vừa đủ)');
  } else {
    const moreVisible = await moreToggle.first().isVisible();
    console.log('a.pj-more-toggle visible:', moreVisible);
    const outer = await moreToggle.first().evaluate((el) => el.outerHTML);
    console.log('more-toggle outerHTML:', outer.slice(0, 400));
    // Cha của more-toggle
    const parentInfo = await moreToggle.first().evaluate((el) => {
      const p = el.closest('.pj-top-item') || el.parentElement;
      return p ? { tag: p.tagName, cls: p.className, id: p.id, html: p.outerHTML.slice(0, 900) } : null;
    });
    console.log('parent của more-toggle:', JSON.stringify(parentInfo, null, 1).slice(0, 1200));
  }

  // Menu cha hiển thị trực tiếp (không nằm trong THÊM)
  const toggles = page.locator('.dropdown-toggle.name-menu--item');
  const toggleTexts = await toggles.allInnerTexts();
  console.log('toggle menu cha:', JSON.stringify(toggleTexts.map((t) => t.trim())));

  // Các selector liên quan panel THÊM
  for (const sel of ['.pj-more-panel', '.pj-more-menu', '.pj-more-toggle + .pj-menu-panel', '.pj-menu-panel']) {
    const loc = page.locator(sel);
    const c = await loc.count();
    if (c) {
      console.log(
        `count ${sel}: ${c}, visible[0]: ${await loc.first().isVisible().catch(() => '?')}`
      );
    } else {
      console.log(`count ${sel}: 0`);
    }
  }

  if (moreCount === 0) {
    await ctx.close();
    return;
  }

  // --- Click THÊM ---
  const panelCandidates = [
    '.pj-more-panel',
    '.pj-more-menu',
    'a.pj-more-toggle ~ *',
  ];
  // Chụp trạng thái trước khi click
  await page.screenshot({ path: `test-results/probe08-${label}-before.png` }).catch(() => {});

  try {
    await moreToggle.first().click({ timeout: 15000 });
    await page.waitForTimeout(1200);
    console.log('click THÊM lần 1 OK');
  } catch (e) {
    console.log('click THÊM lần 1 FAILED:', e.message.split('\n')[0]);
  }

  // Sau click: cái gì hiện ra?
  const moreParent = page.locator('a.pj-more-toggle').first().evaluate((el) => {
    const p = el.closest('.pj-top-item') || el.parentElement;
    return p ? { cls: p.className, htmlLen: p.outerHTML.length } : null;
  });
  console.log('more parent sau click:', JSON.stringify(moreParent));

  // Panel trong cùng pj-top-item với more-toggle
  const morePanel = page
    .locator('a.pj-more-toggle')
    .first()
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
  let panelVisible = false;
  try {
    await morePanel.waitFor({ state: 'visible', timeout: 8000 });
    panelVisible = true;
  } catch {
    console.log('panel trong pj-top-item của THÊM KHÔNG visible sau 8s');
  }
  console.log('panel THÊM visible sau click:', panelVisible);

  if (panelVisible) {
    const panelText = (await morePanel.innerText().catch(() => '')) || '';
    console.log('panel THÊM innerText:', JSON.stringify(panelText.slice(0, 500)));
    const panelLinks = await morePanel.locator('a').allInnerTexts();
    console.log('số <a> trong panel THÊM:', panelLinks.length);
    console.log('links trong panel THÊM:', JSON.stringify(panelLinks.map((t) => t.trim()).slice(0, 20)));
  }

  // Đếm lại tổng link sau khi mở panel
  const after = await countNavLinks(page);
  console.log('TỔNG <a> trong nav (sau khi mở THÊM):', after.total);

  // So sánh before/after theo key text|href
  const key = (i) => `${i.text}::${i.href}`;
  const beforeKeys = new Set(before.items.map(key));
  const afterKeys = new Set(after.items.map(key));
  const lost = [...beforeKeys].filter((k) => !afterKeys.has(k));
  const gained = [...afterKeys].filter((k) => !beforeKeys.has(k));
  console.log('MẤT sau khi mở THÊM:', JSON.stringify(lost));
  console.log('THÊM MỚI sau khi mở:', JSON.stringify(gained.slice(0, 10)));
  console.log('Tổng trước == tổng sau?', before.total === after.total, `(${before.total} vs ${after.total})`);

  // Ảnh chụp sau khi mở
  await page.screenshot({ path: `test-results/probe08-${label}-after-open.png` }).catch(() => {});

  // Click lần 2 → đóng?
  try {
    await moreToggle.first().click({ timeout: 15000 });
    await page.waitForTimeout(800);
    let stillVisible = false;
    try {
      await morePanel.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      stillVisible = true;
    }
    console.log('sau click lần 2: panel vẫn visible?', stillVisible);
  } catch (e) {
    console.log('click THÊM lần 2 FAILED:', e.message.split('\n')[0]);
  }

  // Hover một menu cha bình thường sau khi THÊM từng mở — vẫn hoạt động?
  const capToggle = page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: /^\s*Cấp đơn\s*$/i })
    .first();
  if ((await capToggle.count()) > 0) {
    await capToggle.hover().catch(() => {});
    const capPanel = capToggle
      .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
      .locator('.pj-menu-panel')
      .first();
    try {
      await capPanel.waitFor({ state: 'visible', timeout: 8000 });
      console.log('hover "Cấp đơn" sau khi dùng THÊM → panel vẫn mở OK');
    } catch {
      console.log('hover "Cấp đơn" sau khi dùng THÊM → panel KHÔNG mở');
    }
  }

  console.log('errors:', JSON.stringify(errors.slice(0, 5)));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await probeViewport(browser, 1280, 900, '1280x900');
  await probeViewport(browser, 1600, 900, '1600x900');
  await browser.close();
})();