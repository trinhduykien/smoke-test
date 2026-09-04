const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 1. Dump textContent of each top menu item's panel (works on hidden elements)
  const dump = await page.evaluate(() => {
    const tops = [...document.querySelectorAll('.pj-top-item')].slice(0, 12);
    return tops.map(t => {
      const toggle = t.querySelector('.dropdown-toggle');
      const panel = t.querySelector('.pj-menu-panel');
      const panelText = panel ? (panel.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400) : null;
      const panelId = panel ? (panel.id || null) : null;
      // does the panel have an id or aria attributes linking from toggle?
      return {
        toggleText: toggle ? (toggle.textContent || '').trim().replace(/\s+/g, ' ') : null,
        toggleId: toggle ? toggle.id || null : null,
        liClass: t.className,
        panelClass: panel ? panel.className : null,
        panelId,
        panelText,
      };
    });
  });
  console.log('###TOP ITEMS###');
  console.log(JSON.stringify(dump, null, 1));

  // 2. Check whether "Cấp đơn xe ô tô" exists anywhere in DOM
  const hasCapDonXeOto = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a')].filter(a => /Cấp đơn xe ô tô/i.test(a.textContent || ''));
    return els.slice(0, 5).map(e => ({ text: (e.textContent || '').trim(), href: e.getAttribute('href'), parentCls: e.closest('.pj-menu-panel') ? e.closest('.pj-menu-panel').className : null, visible: !!(e.offsetParent) }));
  });
  console.log('###CAP DON XE OTO LINKS###');
  console.log(JSON.stringify(hasCapDonXeOto, null, 1));

  // 3. User menu toggle structure
  const userMenu = await page.evaluate(() => {
    const t = document.querySelector('#pjUserMenuToggle');
    if (!t) return null;
    const panel = t.closest('.dropdown') || t.parentElement;
    return {
      toggleText: (t.textContent || '').trim(),
      parentCls: panel.className,
      panelText: (panel.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600),
      panelChildren: [...panel.querySelectorAll('.dropdown-menu, [class*=menu-panel]')].map(m => ({ cls: m.className, id: m.id || null, text: (m.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400) })),
    };
  });
  console.log('###USER MENU###');
  console.log(JSON.stringify(userMenu, null, 1));

  // 4. Search toggle structure
  const searchMenu = await page.evaluate(() => {
    const t = document.querySelector('#pjMenuSearchToggle');
    if (!t) return null;
    const panel = document.querySelector('#pjMenuSearchPanel');
    return {
      toggleText: (t.textContent || '').trim(),
      panelExists: !!panel,
      panelVisible: panel ? !!(panel.offsetParent || panel.getClientRects().length) : false,
      panelCls: panel ? panel.className : null,
      inputVisible: (() => { const i = document.querySelector('#pjMenuSearchInput'); return i ? !!(i.offsetParent) : false; })(),
    };
  });
  console.log('###SEARCH MENU###');
  console.log(JSON.stringify(searchMenu, null, 1));

  // 5. Interaction test: hover + click each top menu, check panel visibility
  const tops = ['CẤP ĐƠN', 'THANH TOÁN', 'BỒI THƯỜNG', 'TÁI BẢO HIỂM', 'TIỆN ÍCH'];
  for (const name of tops) {
    try {
      const toggle = page.locator('.dropdown-toggle.name-menu--item', { hasText: name }).first();
      await toggle.scrollIntoViewIfNeeded({ timeout: 10000 });
      await toggle.hover({ timeout: 10000 });
      await page.waitForTimeout(1200);
      let panelVisible = await page.evaluate((nm) => {
        const tg = [...document.querySelectorAll('.dropdown-toggle.name-menu--item')].find(t => (t.textContent || '').trim() === nm);
        if (!tg) return null;
        const top = tg.closest('.pj-top-item');
        if (!top) return null;
        const panel = top.querySelector('.pj-menu-panel');
        if (!panel) return { found: false };
        return { found: true, visible: !!(panel.offsetParent || panel.getClientRects().length), display: getComputedStyle(panel).display, cls: panel.className, sample: (panel.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
      }, name);
      if (!panelVisible || !panelVisible.visible) {
        // try force click
        await toggle.click({ force: true, timeout: 10000 }).catch(e => console.log('click err', e.message.slice(0, 80)));
        await page.waitForTimeout(1200);
        panelVisible = await page.evaluate((nm) => {
          const tg = [...document.querySelectorAll('.dropdown-toggle.name-menu--item')].find(t => (t.textContent || '').trim() === nm);
          if (!tg) return null;
          const top = tg.closest('.pj-top-item');
          const panel = top && top.querySelector('.pj-menu-panel');
          if (!panel) return { found: false };
          return { found: true, visible: !!(panel.offsetParent || panel.getClientRects().length), display: getComputedStyle(panel).display, cls: panel.className, sample: (panel.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
        }, name);
        console.log('###HOVER:' + name + '### (needed click)');
      } else {
        console.log('###HOVER:' + name + '### (hover enough)');
      }
      console.log(JSON.stringify(panelVisible, null, 1));
    } catch (e) {
      console.log('###HOVER:' + name + '### ERROR:', (e.message || '').slice(0, 150));
    }
  }

  // 6. Click search toggle
  try {
    await page.locator('#pjMenuSearchToggle').click({ timeout: 10000 });
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => {
      const panel = document.querySelector('#pjMenuSearchPanel');
      const input = document.querySelector('#pjMenuSearchInput');
      return { panelVisible: !!(panel && (panel.offsetParent || panel.getClientRects().length)), inputVisible: !!(input && (input.offsetParent || input.getClientRects().length)), panelCls: panel ? panel.className : null };
    });
    console.log('###SEARCH TOGGLE CLICK###');
    console.log(JSON.stringify(st, null, 1));
  } catch (e) {
    console.log('###SEARCH TOGGLE CLICK### ERROR:', (e.message || '').slice(0, 150));
  }

  // 7. Click user menu toggle
  try {
    await page.locator('#pjUserMenuToggle').click({ timeout: 10000 });
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => {
      const t = document.querySelector('#pjUserMenuToggle');
      const panel = t ? (t.closest('.dropdown') || t.parentElement) : null;
      const menu = panel ? panel.querySelector('.dropdown-menu, [class*=menu-panel]') : null;
      const visible = menu ? !!(menu.offsetParent || menu.getClientRects().length) : false;
      return { menuVisible: visible, menuCls: menu ? menu.className : null, menuText: menu ? (menu.innerText || menu.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400) : null };
    });
    console.log('###USER TOGGLE CLICK###');
    console.log(JSON.stringify(st, null, 1));
  } catch (e) {
    console.log('###USER TOGGLE CLICK### ERROR:', (e.message || '').slice(0, 150));
  }

  await browser.close();
})();