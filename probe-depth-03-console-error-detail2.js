const { chromium } = require('@playwright/test');
const BASE = 'https://uat-capdon.pjico.com.vn';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });
  const page = await ctx.newPage();

  const resp = await page.goto(BASE + '/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  const html = await resp.text();
  const lines = html.split('\n');
  lines.forEach((l, i) => {
    if (/ErrorHandler/i.test(l)) console.log('HTML line ' + (i + 1) + ': ' + l.trim().slice(0, 250));
  });
  if (!/ErrorHandler/i.test(html)) console.log('Không thấy ErrorHandler trong HTML gốc → script được inject động (document.write / appendChild trong JS).');

  // Theo dõi script element được thêm có src ErrorHandler
  await page.evaluate(() => {
    window.__pjErrScripts = [];
    const orig = document.createElement.bind(document);
    document.createElement = function (tag) {
      const el = orig(tag);
      if (String(tag).toLowerCase() === 'script') {
        const set = el.setAttribute.bind(el);
        el.setAttribute = function (k, v) {
          if (k === 'src' && /ErrorHandler/i.test(String(v))) window.__pjErrScripts.push(String(v));
          return set(k, v);
        };
      }
      return el;
    };
  });
  await page.goto(BASE + '/Home/Index', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2500);
  const injected = await page.evaluate(() => window.__pjErrScripts || []);
  console.log('Script src ErrorHandler được inject:', JSON.stringify(injected));
  // Tìm trong DOM hiện tại (bao gồm cả head)
  const all = await page.$$eval('script', (els) => els.map((e) => e.src || '').filter((s) => /ErrorHandler/i.test(s)));
  console.log('script[src*=ErrorHandler] trong DOM sau load:', JSON.stringify(all));

  await browser.close();
})();