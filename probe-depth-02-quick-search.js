const { chromium } = require('@playwright/test');

/**
 * PROBE — "Tìm nhanh chức năng" (quick menu search)
 * Mục tiêu: nắm hành vi thật trước khi viết spec:
 *  1. #pjMenuSearchToggle click → #pjMenuSearchPanel + #pjMenuSearchInput hiện?
 *  2. fill('cấp đơn') → dropdown kết quả (item "Cấp đơn xe ô tô") hiện?
 *  3. Click kết quả → URL /ContractCar/Search?
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  const urlBefore = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) urlBefore.push(f.url()); });

  const resp = await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  console.log('=== GOTO:', resp.status(), resp.url());

  // Đợi app JS bind handler (lời khuyên từ vòng trước)
  await page.waitForLoadState('load');
  console.log('=== LOAD STATE OK');

  // Trạng thái trước khi bấm toggle
  const before = await page.evaluate(() => {
    const t = document.querySelector('#pjMenuSearchToggle');
    const p = document.querySelector('#pjMenuSearchPanel');
    const i = document.querySelector('#pjMenuSearchInput');
    return {
      toggleExists: !!t,
      toggleText: t ? (t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) : null,
      toggleVisible: t ? !!(t.offsetParent || t.getClientRects().length) : false,
      panelExists: !!p,
      panelCls: p ? p.className : null,
      panelVisible: p ? !!(p.offsetParent || p.getClientRects().length) : false,
      inputExists: !!i,
      inputVisible: i ? !!(i.offsetParent || i.getClientRects().length) : false,
    };
  });
  console.log('###BEFORE TOGGLE###');
  console.log(JSON.stringify(before, null, 1));

  // Click toggle lần 1 — có thể bị nuốt nếu JS chưa bind
  await page.locator('#pjMenuSearchToggle').click({ timeout: 15000 });
  await page.waitForTimeout(800);
  let after = await page.evaluate(() => {
    const p = document.querySelector('#pjMenuSearchPanel');
    const i = document.querySelector('#pjMenuSearchInput');
    return {
      panelVisible: !!(p && (p.offsetParent || p.getClientRects().length)),
      panelDisplay: p ? getComputedStyle(p).display : null,
      inputVisible: !!(i && (i.offsetParent || i.getClientRects().length)),
    };
  });
  console.log('###AFTER CLICK 1###');
  console.log(JSON.stringify(after, null, 1));

  if (!after.inputVisible) {
    console.log('--- Click 1 bị nuốt → click lại lần 2');
    await page.locator('#pjMenuSearchToggle').click({ timeout: 15000 });
    await page.waitForTimeout(800);
    after = await page.evaluate(() => {
      const p = document.querySelector('#pjMenuSearchPanel');
      const i = document.querySelector('#pjMenuSearchInput');
      return {
        panelVisible: !!(p && (p.offsetParent || p.getClientRects().length)),
        panelDisplay: p ? getComputedStyle(p).display : null,
        inputVisible: !!(i && (i.offsetParent || i.getClientRects().length)),
      };
    });
    console.log('###AFTER CLICK 2###');
    console.log(JSON.stringify(after, null, 1));
  }

  // Cấu trúc panel kết quả (cả khi ẩn, để biết selector)
  const panelStruct = await page.evaluate(() => {
    const p = document.querySelector('#pjMenuSearchPanel');
    if (!p) return null;
    const dump = (el, depth) => {
      if (!el || depth > 4) return null;
      return {
        tag: el.tagName, id: el.id || null, cls: (el.className || '').toString().slice(0, 120),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 150),
        children: [...el.children].slice(0, 10).map(c => dump(c, depth + 1)),
      };
    };
    return dump(p, 0);
  });
  console.log('###PANEL STRUCT (empty)###');
  console.log(JSON.stringify(panelStruct, null, 1).slice(0, 4000));

  // Gõ 'cấp đơn' vào ô tìm nhanh
  await page.locator('#pjMenuSearchInput').fill('cấp đơn');
  await page.waitForTimeout(1500); // đợi JS lọc/tìm

  const results = await page.evaluate(() => {
    const p = document.querySelector('#pjMenuSearchPanel');
    const items = [...document.querySelectorAll('#pjMenuSearchPanel a, #pjMenuSearchPanel li, #pjMenuSearchPanel [class*=result], #pjMenuSearchPanel [class*=item]')]
      .filter(e => (e.textContent || '').trim().length > 0 && (e.textContent || '').trim().length < 120);
    return {
      panelVisible: !!(p && (p.offsetParent || p.getClientRects().length)),
      panelText: p ? (p.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 800) : null,
      itemCount: items.length,
      items: items.slice(0, 15).map(e => ({
        tag: e.tagName, id: e.id || null, cls: (e.className || '').toString().slice(0, 100),
        href: e.tagName === 'A' ? e.getAttribute('href') : null,
        text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
        visible: !!(e.offsetParent || e.getClientRects().length),
      })),
    };
  });
  console.log('###RESULTS AFTER FILL "cấp đơn"###');
  console.log(JSON.stringify(results, null, 1).slice(0, 6000));

  // Tìm item "Cấp đơn xe ô tô" trong panel kết quả
  const capDonItem = page.locator('#pjMenuSearchPanel').getByText(/Cấp đơn xe ô tô/i).first();
  const capCount = await page.locator('#pjMenuSearchPanel').getByText(/Cấp đơn xe ô tô/i).count();
  const capVisible = await capDonItem.isVisible().catch(e => 'err:' + e.message.slice(0, 60));
  console.log('###CAP DON XE OTO IN PANEL### count=' + capCount + ' visible=' + capVisible);
  if (capCount > 0) {
    const info = await capDonItem.evaluate(e => ({
      tag: e.tagName, cls: (e.className || '').toString().slice(0, 100),
      href: e.tagName === 'A' ? e.getAttribute('href') : (e.closest('a') ? e.closest('a').getAttribute('href') : null),
      text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
    }));
    console.log('###CAP DON ITEM INFO###');
    console.log(JSON.stringify(info, null, 1));
  }

  // Click kết quả "Cấp đơn xe ô tô" — có thể cần retry click
  if (capCount > 0) {
    let clicked = false;
    for (let attempt = 1; attempt <= 3 && !clicked; attempt++) {
      try {
        await capDonItem.click({ timeout: 10000 });
        clicked = true;
        console.log('###CLICK attempt ' + attempt + ' OK###');
      } catch (e) {
        console.log('###CLICK attempt ' + attempt + ' ERROR### ' + (e.message || '').slice(0, 150));
        await page.waitForTimeout(800);
      }
    }
    // Đợi điều hướng
    try {
      await page.waitForURL(/ContractCar\/Search/i, { timeout: 30000 });
      console.log('###URL AFTER CLICK### ' + page.url());
    } catch (e) {
      console.log('###URL AFTER CLICK (no nav)### ' + page.url());
      // Thử click lần nữa nếu chưa navigate
      if (!/ContractCar\/Search/i.test(page.url())) {
        try {
          await page.locator('#pjMenuSearchPanel').getByText(/Cấp đơn xe ô tô/i).first().click({ timeout: 10000 });
          await page.waitForURL(/ContractCar\/Search/i, { timeout: 30000 });
          console.log('###URL AFTER CLICK 2### ' + page.url());
        } catch (e2) {
          console.log('###STILL NO NAV### ' + page.url() + ' err=' + (e2.message || '').slice(0, 120));
        }
      }
    }
    // Trang đích có tải OK?
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      const title = await page.title();
      console.log('###TITLE### ' + title);
      const serverError = /Server Error|Runtime Error|Exception/i.test(await page.locator('body').innerText({ timeout: 30000 }).catch(() => ''));
      console.log('###SERVER ERROR?### ' + serverError);
    } catch (e) {
      console.log('###TITLE ERR### ' + (e.message || '').slice(0, 100));
    }
  }

  console.log('###NAV LOG###');
  console.log(JSON.stringify(urlBefore, null, 1));

  await page.screenshot({ path: 'test-results/probe-depth-02-quick-search.png', fullPage: false }).catch(() => {});
  await browser.close();
})();