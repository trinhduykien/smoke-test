const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const toggle = page.locator('.dropdown-toggle.name-menu--item').filter({ hasText: /^Tái bảo hiểm$/i }).first();
  const panel = toggle.locator('xpath=ancestor::*[contains(@class,"pj-top-item")]').locator('.pj-menu-panel').first();
  await toggle.hover({ timeout: 10000 });
  await page.waitForTimeout(2000);
  const texts = await page.evaluate(() => {
    const tg = [...document.querySelectorAll('.dropdown-toggle.name-menu--item')].find(t => /^Tái bảo hiểm$/i.test((t.textContent || '').trim()));
    const top = tg.closest('.pj-top-item');
    const panel = top.querySelector('.pj-menu-panel');
    const out = [];
    for (const el of panel.querySelectorAll('a, li, span, div')) {
      const t = (el.textContent || '').trim();
      const direct = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      if (visible && direct && direct.length < 40) out.push({ direct, tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), w: Math.round(rect.width), h: Math.round(rect.height) });
    }
    return out.slice(0, 30);
  });
  console.log(JSON.stringify(texts, null, 1));
  await browser.close();
})();