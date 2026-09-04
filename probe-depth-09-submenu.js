const { chromium } = require('@playwright/test');

// Probe: submenu lồng trong menu TIỆN ÍCH — toggle "Hệ thống mã" và "Báo cáo"
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  const resp = await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForLoadState('load');
  console.log('### HTTP:', resp && resp.status(), 'TITLE:', await page.title());

  // Nếu session hết hạn
  const email = await page.locator('#EMAIL').count();
  console.log('### LOGIN FORM PRESENT:', email > 0);

  // Toggle TIỆN ÍCH
  const tienIch = page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: /^\s*Tiện ích\s*$/i })
    .first();
  console.log('### TIEN ICH toggle count:', await page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: /^\s*Tiện ích\s*$/i }).count());

  await tienIch.hover();
  await page.waitForTimeout(800);

  // Panel của TIỆN ÍCH
  const panel = tienIch
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
  const panelVisible = await panel.isVisible().catch(() => false);
  console.log('### TIEN ICH panel visible after hover:', panelVisible);
  console.log('### TIEN ICH panel class:', await panel.getAttribute('class').catch(() => null));
  console.log('### TIEN ICH panel parent chain (open state?):');

  // Dump cấu trúc menu con trong panel TIỆN ÍCH
  const structure = await page.evaluate(() => {
    const toggles = [...document.querySelectorAll('.pj-menu-panel .dropdown-toggle')];
    return toggles.map((t) => {
      const parent = t.closest('[class*=dropdown], [class*=menu-item], li, .pj-top-item');
      const ownPanel = t.parentElement ? t.parentElement.querySelector('.pj-menu-panel, [class*=panel], [class*=submenu], [class*=sub-menu]') : null;
      let nestedPanel = null;
      // tìm panel nằm trong cùng container với toggle
      let container = t.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        const p = container.querySelector(':scope > .pj-menu-panel');
        if (p) { nestedPanel = p; break; }
        container = container.parentElement;
      }
      return {
        text: (t.innerText || '').trim(),
        cls: t.className,
        parentCls: parent ? parent.className : null,
        parentTag: parent ? parent.tagName : null,
        hasNestedPanel: !!nestedPanel,
        nestedPanelCls: nestedPanel ? nestedPanel.className : null,
        nestedPanelItems: nestedPanel
          ? [...nestedPanel.querySelectorAll('a')].slice(0, 6).map((a) => (a.innerText || '').trim())
          : null,
      };
    });
  });
  console.log('### NESTED TOGGLES IN TIEN ICH PANEL:');
  console.log(JSON.stringify(structure, null, 1));

  // Thử HOVER toggle "Hệ thống mã" trong panel
  const htmToggle = panel.locator('.dropdown-toggle').filter({ hasText: /hệ thống mã/i }).first();
  console.log('### "Hệ thống mã" toggle count in panel:', await panel
    .locator('.dropdown-toggle').filter({ hasText: /hệ thống mã/i }).count());

  const beforeCls = await htmToggle.evaluate((el) => {
    let p = el.parentElement;
    const chain = [];
    for (let i = 0; i < 4 && p; i++) { chain.push(p.className); p = p.parentElement; }
    return { self: el.className, chain };
  });
  console.log('### HTM toggle self class:', beforeCls.self, '| chain:', JSON.stringify(beforeCls.chain));

  const childPanelBefore = await htmToggle
    .evaluate((el) => {
      let container = el.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        const p = container.querySelector(':scope > .pj-menu-panel');
        if (p) return { found: true, cls: p.className, visible: !!(p.offsetWidth || p.offsetHeight) };
        container = container.parentElement;
      }
      return { found: false };
    });
  console.log('### HTM child panel BEFORE hover:', JSON.stringify(childPanelBefore));

  await htmToggle.hover();
  await page.waitForTimeout(800);
  const childPanelAfterHover = await htmToggle
    .evaluate((el) => {
      let container = el.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        const p = container.querySelector(':scope > .pj-menu-panel');
        if (p) return { found: true, cls: p.className, visible: !!(p.offsetWidth || p.offsetHeight) };
        container = container.parentElement;
      }
      return { found: false };
    });
  console.log('### HTM child panel AFTER hover:', JSON.stringify(childPanelAfterHover));

  // Nếu hover không mở, thử CLICK
  if (!childPanelAfterHover.found || !childPanelAfterHover.visible) {
    await htmToggle.click();
    await page.waitForTimeout(800);
    const afterClick = await htmToggle
      .evaluate((el) => {
        let container = el.parentElement;
        for (let i = 0; i < 4 && container; i++) {
          const p = container.querySelector(':scope > .pj-menu-panel');
          if (p) return { found: true, cls: p.className, visible: !!(p.offsetWidth || p.offsetHeight) };
          container = container.parentElement;
        }
        return { found: false };
      });
    console.log('### HTM child panel AFTER CLICK:', JSON.stringify(afterClick));

    // Panel TIỆN ÍCH cha còn mở không sau khi click con?
    console.log('### TIEN ICH parent panel still visible after child click:',
      await panel.isVisible().catch(() => false));

    // Dump items con của Hệ thống mã
    const items = await htmToggle.evaluate((el) => {
      let container = el.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        const p = container.querySelector(':scope > .pj-menu-panel');
        if (p) return [...p.querySelectorAll('a')].slice(0, 10).map((a) => ({
          text: (a.innerText || '').trim(), href: a.getAttribute('href'),
          visible: !!(a.offsetWidth || a.offsetHeight),
        }));
        container = container.parentElement;
      }
      return [];
    });
    console.log('### HTM child items:', JSON.stringify(items, null, 1));

    // Click lần 2 → panel con đóng? (quan sát hành vi toggle)
    await htmToggle.click();
    await page.waitForTimeout(500);
    const afterClick2 = await htmToggle
      .evaluate((el) => {
        let container = el.parentElement;
        for (let i = 0; i < 4 && container; i++) {
          const p = container.querySelector(':scope > .pj-menu-panel');
          if (p) return { found: true, visible: !!(p.offsetWidth || p.offsetHeight) };
          container = container.parentElement;
        }
        return { found: false };
      });
    console.log('### HTM child panel AFTER 2nd CLICK (toggle?):', JSON.stringify(afterClick2));
  }

  // Tương tự với "Báo cáo"
  const bcToggle = panel.locator('.dropdown-toggle').filter({ hasText: /báo cáo/i }).first();
  console.log('### "Báo cáo" toggle count in panel:', await panel
    .locator('.dropdown-toggle').filter({ hasText: /báo cáo/i }).count());

  // panel TIỆN ÍCH còn mở không (chuột đã di chuyển)?
  if (!(await panel.isVisible().catch(() => false))) {
    await tienIch.hover();
    await page.waitForTimeout(600);
    console.log('### re-hover TIEN ICH, panel visible:', await panel.isVisible().catch(() => false));
  }

  const bcBefore = await bcToggle.evaluate((el) => {
    let container = el.parentElement;
    for (let i = 0; i < 4 && container; i++) {
      const p = container.querySelector(':scope > .pj-menu-panel');
      if (p) return { found: true, visible: !!(p.offsetWidth || p.offsetHeight) };
      container = container.parentElement;
    }
    return { found: false };
  });
  console.log('### BC child panel BEFORE:', JSON.stringify(bcBefore));

  await bcToggle.hover();
  await page.waitForTimeout(800);
  const bcAfterHover = await bcToggle.evaluate((el) => {
    let container = el.parentElement;
    for (let i = 0; i < 4 && container; i++) {
      const p = container.querySelector(':scope > .pj-menu-panel');
      if (p) return { found: true, visible: !!(p.offsetWidth || p.offsetHeight) };
      container = container.parentElement;
    }
    return { found: false };
  });
  console.log('### BC child panel AFTER hover:', JSON.stringify(bcAfterHover));

  if (!bcAfterHover.found || !bcAfterHover.visible) {
    await bcToggle.click();
    await page.waitForTimeout(800);
    const bcItems = await bcToggle.evaluate((el) => {
      let container = el.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        const p = container.querySelector(':scope > .pj-menu-panel');
        if (p) return [...p.querySelectorAll('a')].slice(0, 12).map((a) => ({
          text: (a.innerText || '').trim(), href: a.getAttribute('href'),
          visible: !!(a.offsetWidth || a.offsetHeight),
        }));
        container = container.parentElement;
      }
      return [];
    });
    console.log('### BC child items after click:', JSON.stringify(bcItems, null, 1));
  }

  // Dump toàn bộ class của các ancestor của toggle "Hệ thống mã" khi panel cha đang mở
  const ancestorInfo = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.pj-menu-panel .dropdown-toggle')]
      .find((x) => /hệ thống mã/i.test(x.innerText || ''));
    if (!t) return null;
    const out = [];
    let p = t.parentElement;
    for (let i = 0; i < 6 && p; i++) {
      out.push({ tag: p.tagName, cls: p.className });
      p = p.parentElement;
    }
    return out;
  });
  console.log('### HTM toggle ancestors:', JSON.stringify(ancestorInfo, null, 1));

  await browser.close();
})().catch((e) => { console.error('PROBE FAILED:', e); process.exit(1); });