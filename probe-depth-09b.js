const { chromium } = require('@playwright/test');

// Probe 2: dump DOM quanh "Hệ thống mã" / "Báo cáo" trong menu TIỆN ÍCH
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', {
    waitUntil: 'load',
    timeout: 90000,
  });
  await page.waitForTimeout(1500);

  // 1. Tìm mọi phần tử có text "Hệ thống mã" và dump ancestor chain
  const info = await page.evaluate(() => {
    const out = {};
    const find = (label, re) => {
      const els = [...document.querySelectorAll('*')].filter(
        (e) => e.children.length === 0 && re.test((e.innerText || e.textContent || '').trim())
      );
      out[label] = els.map((e) => {
        const chain = [];
        let p = e;
        for (let i = 0; i < 8 && p; i++) {
          chain.push({ tag: p.tagName, cls: p.className, id: p.id });
          p = p.parentElement;
        }
        return { text: (e.innerText || '').trim(), tag: e.tagName, chain };
      });
    };
    find('hethongma', /^hệ thống mã$/i);
    find('baocao', /^báo cáo$/i);
    // Toggle TIỆN ÍCH
    const t = [...document.querySelectorAll('a')].find(
      (e) => /tiện ích/i.test((e.innerText || '').trim())
    );
    out['tienich'] = t ? { cls: t.className, id: t.id, href: t.getAttribute('href') } : null;
    return out;
  });
  console.log('### TOÀN BỘ PHẦN TỬ TEXT "Hệ thống mã"/"Báo cáo" + ancestors:');
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch((e) => { console.error('PROBE FAILED:', e.message); process.exit(1); });