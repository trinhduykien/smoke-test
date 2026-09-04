const { chromium } = require('@playwright/test');

// Probe 3: mở panel "HỆ THỐNG MÃ" và "BÁO CÁO" (top-level, pj-top-item--split),
// dump nội dung panel + nested toggle bên trong panel
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
  await page.waitForTimeout(2000);

  // Danh sách menu top hiển thị thật sự (offsetWidth) tại 1600px
  const topItems = await page.evaluate(() => {
    return [...document.querySelectorAll('#navbar-collapse-x > ul > li')].map((li) => {
      const a = li.querySelector('a');
      const panel = li.querySelector('.pj-menu-panel');
      return {
        text: a ? (a.innerText || '').trim() : '',
        cls: li.className,
        visible: !!(li.offsetWidth || li.offsetHeight),
        panelCls: panel ? panel.className : null,
        panelVisible: panel ? !!(panel.offsetWidth || panel.offsetHeight) : false,
      };
    });
  });
  console.log('### TOP ITEMS @1600px:', JSON.stringify(topItems, null, 1));

  async function probeMenu(name, re) {
    const toggle = page
      .locator('.dropdown-toggle.name-menu--item')
      .filter({ hasText: re })
      .first();
    const n = await toggle.count();
    console.log(`\n===== ${name}: toggle count=${n}`);
    if (!n) return;
    const vis = await toggle.isVisible().catch(() => false);
    console.log(`${name} toggle visible:`, vis);
    if (!vis) {
      console.log(`${name} KHÔNG hiển thị — có thể nằm trong THÊM`);
      return;
    }
    const liCls = await toggle.evaluate((el) => el.closest('li').className);
    console.log(`${name} li class:`, liCls);

    await toggle.hover();
    await page.waitForTimeout(1000);

    const dump = await toggle.evaluate((el) => {
      const li = el.closest('li');
      const panel = li.querySelector('.pj-menu-panel');
      if (!panel) return { panel: null };
      const groups = [...panel.querySelectorAll('.dropdown-toggle')].map((t) => {
        let container = t.parentElement;
        let nested = null;
        for (let i = 0; i < 4 && container; i++) {
          const p = container.querySelector(':scope > .pj-menu-panel');
          if (p) { nested = p; break; }
          container = container.parentElement;
        }
        return {
          text: (t.innerText || '').trim(),
          nestedPanelVisible: nested ? !!(nested.offsetWidth || nested.offsetHeight) : null,
          nestedItems: nested
            ? [...nested.querySelectorAll('a')].slice(0, 10).map((a) => (a.innerText || '').trim())
            : null,
        };
      });
      return {
        panelCls: panel.className,
        panelVisible: !!(panel.offsetWidth || panel.offsetHeight),
        directLinks: [...panel.querySelectorAll('a')]
          .slice(0, 40)
          .map((a) => ({
            text: (a.innerText || '').trim().replace(/\s+/g, ' '),
            href: a.getAttribute('href'),
            visible: !!(a.offsetWidth || a.offsetHeight),
            cls: a.className.split(' ').slice(0, 3).join(' '),
          })),
        nestedToggles: groups,
      };
    });
    console.log(`${name} PANEL:`, JSON.stringify(dump, null, 1));
  }

  await probeMenu('HỆ THỐNG MÃ', /hệ thống mã/i);
  await probeMenu('BÁO CÁO', /^báo cáo$/i);
  await probeMenu('TIỆN ÍCH', /tiện ích/i);

  await browser.close();
})().catch((e) => { console.error('PROBE FAILED:', e.message); process.exit(1); });