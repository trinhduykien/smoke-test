const { chromium } = require('@playwright/test');

// PROBE 07c — tìm phần tử tràn BÊN PHẢI gây horizontal scrollbar 440px lúc load
// + theo dõi scrollWidth theo thời gian

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });

  const measure = async (label) => {
    const dims = await page.evaluate(() => {
      const cw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const bad = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > cw + 2) {
          bad.push({
            tag: el.tagName, id: el.id || '',
            cls: (el.className || '').toString().slice(0, 70),
            right: Math.round(r.right), w: Math.round(r.width),
          });
        }
      });
      return { sw, cw, bad: bad.slice(0, 12) };
    });
    console.log(`[${label}] scrollW=${dims.sw} clientW=${dims.cw}`);
    dims.bad.forEach(b => console.log('   TRÀN PHẢI:', JSON.stringify(b)));
  };

  await measure('domcontentloaded');
  await page.waitForLoadState('load');
  await measure('load');
  await page.waitForTimeout(500);
  await measure('+500ms');
  await page.waitForTimeout(1500);
  await measure('+2s');
  await page.waitForTimeout(3000);
  await measure('+5s');

  await browser.close();
})();