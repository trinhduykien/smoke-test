const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // A. User menu DOM structure around #pjUserMenuToggle
  const userStruct = await page.evaluate(() => {
    const t = document.querySelector('#pjUserMenuToggle');
    if (!t) return null;
    const dump = (el, depth) => {
      if (!el || depth > 5) return null;
      return {
        tag: el.tagName, id: el.id || null, cls: (el.className || '').toString().slice(0, 100),
        ownText: [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').slice(0, 80),
        children: [...el.children].slice(0, 8).map(c => dump(c, depth + 1)),
      };
    };
    // walk up 3 levels then dump
    let root = t;
    for (let i = 0; i < 3; i++) root = root.parentElement;
    return dump(root, 0);
  });
  console.log('###USER STRUCT###');
  console.log(JSON.stringify(userStruct, null, 1));

  // Find elements containing 'Tạo QR cấp đơn'
  const qrItems = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a, button, li, span, div')].filter(e => /Tạo QR cấp đơn/i.test(e.textContent || '') && (e.textContent || '').length < 60);
    return els.slice(0, 10).map(e => ({ tag: e.tagName, id: e.id || null, cls: (e.className || '').toString().slice(0, 100), href: e.getAttribute ? e.getAttribute('href') : null, text: (e.textContent || '').trim(), visible: !!(e.offsetParent || e.getClientRects().length), cls2: e.parentElement ? (e.parentElement.className || '').toString().slice(0, 100) : null }));
  });
  console.log('###QR CAP DON ELEMENTS###');
  console.log(JSON.stringify(qrItems, null, 1));

  // B. hover each top menu with case-insensitive match, check link visibility via Playwright-style
  const tops = ['Cấp đơn', 'Thanh toán', 'Bồi thường', 'Tái bảo hiểm', 'Tiện ích'];
  const childProbe = {
    'Cấp đơn': 'Cấp đơn xe ô tô',
    'Thanh toán': 'Thanh toán phí',
    'Bồi thường': 'Tìm hồ sơ',
    'Tái bảo hiểm': 'Phân bổ tỷ lệ tái',
    'Tiện ích': 'Duyệt hợp đồng',
  };
  for (const name of tops) {
    try {
      const toggle = page.locator('.dropdown-toggle.name-menu--item').filter({ hasText: new RegExp('^' + name + '$', 'i') }).first();
      const cnt = await page.locator('.dropdown-toggle.name-menu--item').filter({ hasText: new RegExp('^' + name + '$', 'i') }).count();
      await toggle.hover({ timeout: 10000 });
      await page.waitForTimeout(1500);
      // find child link inside same top-item
      const linkLocator = toggle.locator('xpath=ancestor::*[contains(@class,"pj-top-item")]').locator('.pj-menu-panel').getByText(childProbe[name], { exact: false }).first();
      let linkVisible = false, linkCount = 0;
      try { linkCount = await linkLocator.count(); if (linkCount > 0) linkVisible = await linkLocator.isVisible(); } catch (e) {}
      console.log('###HOVER:' + name + '### toggleCount=' + cnt + ' linkCount=' + linkCount + ' linkVisible=' + linkVisible);
      if (!linkVisible) {
        await toggle.click({ force: true, timeout: 10000 });
        await page.waitForTimeout(1500);
        try { linkVisible = await linkLocator.isVisible(); } catch (e) {}
        console.log('###AFTER CLICK:' + name + '### linkVisible=' + linkVisible);
      }
    } catch (e) {
      console.log('###HOVER:' + name + '### ERROR:', (e.message || '').slice(0, 150));
    }
  }

  // C. search panel visibility via Playwright isVisible before and after click
  const inputBefore = await page.locator('#pjMenuSearchInput').isVisible().catch(() => 'err');
  await page.locator('#pjMenuSearchToggle').click({ timeout: 10000 });
  await page.waitForTimeout(800);
  const inputAfter = await page.locator('#pjMenuSearchInput').isVisible().catch(() => 'err');
  const panelAfter = await page.locator('#pjMenuSearchPanel').isVisible().catch(() => 'err');
  console.log('###SEARCH### inputBefore=' + inputBefore + ' inputAfter=' + inputAfter + ' panelAfter=' + panelAfter);

  // D. user menu: click toggle and find which element becomes visible containing the items
  const userToggle = page.locator('#pjUserMenuToggle');
  const before = await page.evaluate(() => {
    const items = ['Tạo QR cấp đơn', 'Đổi mật khẩu', 'Đăng xuất'];
    return items.map(txt => {
      const els = [...document.querySelectorAll('a, button, li, span, div')].filter(e => (e.textContent || '').trim() === txt || ((e.textContent || '').trim().length < 30 && (e.textContent || '').includes(txt)));
      const target = els.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
      return { txt, found: !!target, tag: target ? target.tagName : null, cls: target ? (target.className || '').toString().slice(0, 80) : null, visible: target ? !!(target.offsetParent || target.getClientRects().length) : false, parentCls: target && target.parentElement ? (target.parentElement.className || '').toString().slice(0, 80) : null };
    });
  });
  console.log('###USER ITEMS BEFORE CLICK###');
  console.log(JSON.stringify(before, null, 1));
  await userToggle.click({ timeout: 10000 });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => {
    const items = ['Tạo QR cấp đơn', 'Đổi mật khẩu', 'Đăng xuất'];
    return items.map(txt => {
      const els = [...document.querySelectorAll('a, button, li, span, div')].filter(e => (e.textContent || '').trim() === txt || ((e.textContent || '').trim().length < 30 && (e.textContent || '').includes(txt)));
      const target = els.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
      return { txt, found: !!target, tag: target ? target.tagName : null, cls: target ? (target.className || '').toString().slice(0, 80) : null, visible: target ? !!(target.offsetParent || target.getClientRects().length) : false, parentCls: target && target.parentElement ? (target.parentElement.className || '').toString().slice(0, 80) : null };
    });
  });
  console.log('###USER ITEMS AFTER CLICK###');
  console.log(JSON.stringify(after, null, 1));

  await browser.close();
})();