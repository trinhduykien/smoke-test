const { chromium } = require('@playwright/test');

// PROBE 07b — đào sâu cấu trúc drawer mobile menu + tìm phần tử gây tràn ngang

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(800);

  // ---- 1. Tìm phần tử gây tràn ngang (right > clientWidth) ----
  const overflow = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const bad = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > cw + 2 || r.left < -2)) {
        bad.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          id: el.id || '',
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        });
      }
    });
    return bad.slice(0, 30);
  });
  console.log('OVERFLOWING ELEMENTS (390px):');
  overflow.forEach(o => console.log('  ', JSON.stringify(o)));

  // ---- 2. Cấu trúc drawer mobile ----
  const drawerInfo = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('.pj-nav-label'));
    const cap = spans.find(s => /cấp đơn/i.test(s.textContent || ''));
    if (!cap) return 'không tìm thấy .pj-nav-label "Cấp đơn"';
    // leo lên ancestors
    const chain = [];
    let el = cap;
    for (let i = 0; i < 8 && el; i++) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      chain.push({
        tag: el.tagName, id: el.id || '', cls: (el.className || '').toString().slice(0, 90),
        x: Math.round(r.left), visible: st.display !== 'none' && st.visibility !== 'hidden',
        transform: st.transform !== 'none' ? st.transform.slice(0, 60) : '',
        transition: st.transition.slice(0, 80),
      });
      el = el.parentElement;
    }
    return chain;
  });
  console.log('ANCESTOR CHAIN của "CẤP ĐƠN" (trước khi bấm toggle):');
  console.log(JSON.stringify(drawerInfo, null, 1));

  // ---- 3. aria-expanded trước / sau khi bấm ----
  const t = page.locator('#pjMobileMenuToggle');
  console.log('aria-expanded BEFORE:', await t.getAttribute('aria-expanded'));
  await t.click();
  await page.waitForTimeout(1500);
  console.log('aria-expanded AFTER click1:', await t.getAttribute('aria-expanded'));
  console.log('toggle aria-label AFTER:', await t.getAttribute('aria-label'));

  // chain sau khi mở
  const drawerInfo2 = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('.pj-nav-label'));
    const cap = spans.find(s => /cấp đơn/i.test(s.textContent || ''));
    const chain = [];
    let el = cap;
    for (let i = 0; i < 8 && el; i++) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      chain.push({
        tag: el.tagName, id: el.id || '', cls: (el.className || '').toString().slice(0, 90),
        x: Math.round(r.left),
        display: st.display, visibility: st.visibility,
        transform: st.transform !== 'none' ? st.transform.slice(0, 60) : '',
      });
      el = el.parentElement;
    }
    return chain;
  });
  console.log('ANCESTOR CHAIN sau khi bấm toggle:');
  console.log(JSON.stringify(drawerInfo2, null, 1));

  // scroll ngang khi menu mở
  console.log('scrollW/clientW khi menu mở:', await page.evaluate(() =>
    [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
  console.log('body overflow khi menu mở:', await page.evaluate(() => getComputedStyle(document.body).overflow));

  await page.screenshot({ path: 'test-results/probe07b-menu-open.png' });

  // ---- 4. Click mục "CẤP ĐƠN" trong drawer (accordion mở submenu?) ----
  const capLabel = page.locator('.pj-nav-label', { hasText: /cấp đơn/i }).first();
  const capBox = await capLabel.boundingBox();
  console.log('"CẤP ĐƠN" box khi menu mở:', JSON.stringify(capBox));

  // Bấm cha của label (thường là button/a toggle accordion)
  const capToggle = capLabel.locator('xpath=ancestor::button[1] | ancestor::a[1]').first();
  const toggleInfo = await capToggle.evaluate(el => ({ tag: el.tagName, cls: el.className, txt: el.innerText.slice(0, 40) })).catch(e => 'ERR ' + e.message);
  console.log('toggle cha của "CẤP ĐƠN":', JSON.stringify(toggleInfo));

  try {
    await capToggle.click({ timeout: 10000 });
    await page.waitForTimeout(1000);
    // submenu "Cấp đơn xe ô tô" hiện?
    const sub = page.getByText('Cấp đơn xe ô tô', { exact: true });
    const subCount = await sub.count();
    let subVisible = false, subBox = null;
    if (subCount) { subVisible = await sub.first().isVisible(); subBox = await sub.first().boundingBox(); }
    console.log('submenu "Cấp đơn xe ô tô": count=', subCount, 'visible=', subVisible, 'box=', JSON.stringify(subBox));
  } catch (e) {
    console.log('click accordion FAILED:', e.message.split('\n')[0]);
  }
  await page.screenshot({ path: 'test-results/probe07b-submenu-open.png' });

  // ---- 5. Đóng menu bằng toggle lần 2 ----
  await t.click();
  await page.waitForTimeout(1200);
  console.log('aria-expanded AFTER click2 (đóng):', await t.getAttribute('aria-expanded'));
  const capBox2 = await capLabel.boundingBox();
  console.log('"CẤP ĐƠN" box sau khi đóng:', JSON.stringify(capBox2));
  console.log('scrollW/clientW sau khi đóng:', await page.evaluate(() =>
    [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
  await page.screenshot({ path: 'test-results/probe07b-menu-closed.png' });

  await ctx.close();
  await browser.close();
})();