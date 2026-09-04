const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'load', timeout: 90000 });
  console.log('URL:', page.url());

  // Có ô email không (session hết hạn)?
  const emailCount = await page.locator('#EMAIL').count();
  console.log('#EMAIL count:', emailCount);
  if (emailCount > 0) { console.log('SESSION HẾT HẠN!'); await browser.close(); return; }

  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  // Modal tồn tại trước khi mở?
  const modal = page.locator('#modal_MonthlyRevenue');
  console.log('#modal_MonthlyRevenue count:', await modal.count());
  if (await modal.count()) {
    console.log('modal classes:', await modal.getAttribute('class'));
    console.log('modal visible?', await modal.isVisible());
    console.log('modal aria-hidden:', await modal.getAttribute('aria-hidden'));
    console.log('modal style:', await modal.getAttribute('style'));
  }

  // Tìm nút 'Xem chi tiết các tháng'
  const candidates = page.getByRole('button', { name: /xem chi tiết/i });
  console.log('buttons matching /xem chi tiết/i:', await candidates.count());
  const btnText = page.getByText(/xem chi tiết các tháng/i);
  console.log('elements with text "Xem chi tiết các tháng":', await btnText.count());
  for (let i = 0; i < await btnText.count(); i++) {
    const el = btnText.nth(i);
    console.log(`  [${i}] tag=${await el.evaluate(e => e.tagName)}, id=${await el.getAttribute('id')}, cls=${await el.getAttribute('class')}, visible=${await el.isVisible()}`);
  }

  // Click nút mở modal
  const openBtn = page.locator('button', { hasText: /xem chi tiết các tháng/i }).first();
  const openBtnCount = await openBtn.count();
  console.log('button[hasText] count:', openBtnCount);
  if (openBtnCount === 0) {
    console.log('FALLBACK: không tìm thấy <button>, thử click phần tử text...');
  }
  const clickTarget = openBtnCount > 0 ? openBtn : btnText.first();
  await clickTarget.click({ timeout: 30000 });
  await page.waitForTimeout(1500);

  console.log('--- SAU KHI CLICK ---');
  console.log('modal classes:', await modal.getAttribute('class'));
  console.log('modal visible?', await modal.isVisible());
  console.log('modal style:', await modal.getAttribute('style'));
  console.log('modal inViewportClass / display:', await modal.evaluate(e => getComputedStyle(e).display));

  // Nội dung modal
  const html = await modal.evaluate(e => e.outerHTML);
  console.log('--- modal outerHTML (2000 chars đầu) ---');
  console.log(html.slice(0, 2000));
  console.log('--- hết modal HTML (2000 chars cuối) ---');
  console.log(html.slice(-2000));

  // Heading trong modal
  const headings = modal.locator('h1, h2, h3, h4, h5, .modal-title, .header-title, strong, b');
  console.log('heading-like count trong modal:', await headings.count());
  for (let i = 0; i < Math.min(await headings.count(), 15); i++) {
    const h = headings.nth(i);
    console.log(`  [${i}] tag=${await h.evaluate(e => e.tagName)}, text="${(await h.innerText()).trim().slice(0, 80)}", visible=${await h.isVisible()}`);
  }

  // Tìm text 'Chi tiết doanh thu theo từng tháng'
  const headingLocator = page.getByText(/chi tiết doanh thu theo từng tháng/i);
  console.log('text "Chi tiết doanh thu theo từng tháng" count (toàn trang):', await headingLocator.count());
  for (let i = 0; i < await headingLocator.count(); i++) {
    const h = headingLocator.nth(i);
    console.log(`  [${i}] tag=${await h.evaluate(e => e.tagName)}, id=${await h.getAttribute('id')}, cls=${await h.getAttribute('class')}, visible=${await h.isVisible()}`);
  }

  // Các nút trong modal
  const closeBtns = modal.locator('.close');
  console.log('.close count trong modal:', await closeBtns.count());
  for (let i = 0; i < await closeBtns.count(); i++) {
    const b = closeBtns.nth(i);
    console.log(`  close[${i}] tag=${await b.evaluate(e => e.tagName)}, text="${(await b.innerText() || '').trim()}", visible=${await b.isVisible()}, cls=${await b.getAttribute('class')}`);
  }
  const allBtns = modal.locator('button, a.btn, input[type=button], input[type=submit]');
  console.log('buttons trong modal:', await allBtns.count());
  for (let i = 0; i < Math.min(await allBtns.count(), 15); i++) {
    const b = allBtns.nth(i);
    console.log(`  btn[${i}] tag=${await b.evaluate(e => e.tagName)}, text="${(await b.innerText() || b.getAttribute('value') || '').trim().slice(0, 40)}", cls=${await b.getAttribute('class')}, visible=${await b.isVisible()}`);
  }

  await page.screenshot({ path: 'test-results/probe-modal-open.png' });

  // Đóng bằng .close
  await closeBtns.first().click({ timeout: 30000 });
  await page.waitForTimeout(1200);
  console.log('--- SAU KHI BẤM .close ---');
  console.log('modal visible?', await modal.isVisible());
  console.log('modal classes:', await modal.getAttribute('class'));
  console.log('modal display:', await modal.evaluate(e => getComputedStyle(e).display).catch(() => 'N/A'));

  // Mở lại và đóng bằng Escape
  await clickTarget.click({ timeout: 30000 });
  await page.waitForTimeout(1200);
  console.log('modal visible sau khi mở lại?', await modal.isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  console.log('--- SAU KHI BẤM ESCAPE ---');
  console.log('modal visible?', await modal.isVisible());
  console.log('modal classes:', await modal.getAttribute('class'));

  await page.screenshot({ path: 'test-results/probe-modal-closed.png' });
  await browser.close();
})();