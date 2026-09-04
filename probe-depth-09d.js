const { chromium } = require('@playwright/test');

// Probe 4: chuyển tiếp giữa các panel + click leaf điều hướng + trạng thái ẩn/hiện mục
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

  const toggleOf = (re) =>
    page.locator('.dropdown-toggle.name-menu--item').filter({ hasText: re }).first();
  const panelOf = (re) =>
    toggleOf(re)
      .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
      .locator('.pj-menu-panel')
      .first();

  // 1. Hover TIỆN ÍCH -> panel mở; hover HỆ THỐNG MÃ -> panel TIỆN ÍCH đóng, panel HTM mở
  await toggleOf(/tiện ích/i).hover();
  await page.waitForTimeout(700);
  const pTienIch1 = await panelOf(/tiện ích/i).isVisible().catch(() => false);
  const pTienIchCls1 = await panelOf(/tiện ích/i).getAttribute('class');
  console.log('### After hover TIEN ICH: panel visible =', pTienIch1, '| cls =', pTienIchCls1);

  await toggleOf(/hệ thống mã/i).hover();
  await page.waitForTimeout(700);
  const pTienIch2 = await panelOf(/tiện ích/i).isVisible().catch(() => false);
  const pHtm2 = await panelOf(/hệ thống mã/i).isVisible().catch(() => false);
  console.log('### After hover HTM: TienIch panel visible =', pTienIch2, '| HTM panel visible =', pHtm2);

  // 2. Trong panel HTM: mục hiển thị vs ẩn (Playwright isVisible)
  const htmPanel = panelOf(/hệ thống mã/i);
  const vis = async (txt) => {
    const loc = htmPanel.getByText(txt, { exact: true }).first();
    return (await loc.count()) ? await loc.isVisible().catch(() => false) : 'NOT_IN_DOM';
  };
  console.log('### HTM "Mã đơn vị" visible:', await vis('Mã đơn vị'));
  console.log('### HTM "Mã khách hàng" visible:', await vis('Mã khách hàng'));
  console.log('### HTM "Mã người sử dụng" visible:', await vis('Mã người sử dụng'));
  console.log('### HTM "Mã cán bộ" visible:', await vis('Mã cán bộ'));

  // 3. Click leaf "Mã đơn vị" -> điều hướng /CategorySystem/Unit
  await htmPanel.getByText('Mã đơn vị', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  console.log('### After click "Mã đơn vị": URL =', page.url());
  console.log('### TITLE =', await page.title());

  // 4. Quay về dashboard, hover BÁO CÁO
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await toggleOf(/^báo cáo$/i).hover();
  await page.waitForTimeout(700);
  const pBc = await panelOf(/^báo cáo$/i).isVisible().catch(() => false);
  console.log('### BC panel visible after hover:', pBc);
  const bcPanel = panelOf(/^báo cáo$/i);
  const vis2 = async (txt) => {
    const loc = bcPanel.getByText(txt, { exact: true }).first();
    return (await loc.count()) ? await loc.isVisible().catch(() => false) : 'NOT_IN_DOM';
  };
  console.log('### BC "Báo cáo doanh thu bảo hiểm CSSK (6901/6903)" visible:',
    await vis2('Báo cáo doanh thu bảo hiểm CSSK (6901/6903)'));
  console.log('### BC "DT theo đối tượng quản lý" visible:', await vis2('DT theo đối tượng quản lý'));
  console.log('### BC "Báo cáo tổng hợp khai thác TLO" visible:',
    await vis2('Báo cáo tổng hợp khai thác TLO'));
  console.log('### BC "APP - Dashboard tổng hợp" visible:', await vis2('APP - Dashboard tổng hợp'));

  // 5. Click leaf "Báo cáo doanh thu bảo hiểm CSSK (6901/6903)" -> /Report/HealthReport
  await bcPanel.getByText('Báo cáo doanh thu bảo hiểm CSSK (6901/6903)', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  console.log('### After click BC CSSK: URL =', page.url());
  console.log('### TITLE =', await page.title());

  // 6. Hover lại BÁO CÁO từ trang report (menu vẫn còn?) — panel mở lại
  await toggleOf(/^báo cáo$/i).hover();
  await page.waitForTimeout(700);
  console.log('### BC panel visible again on report page:',
    await panelOf(/^báo cáo$/i).isVisible().catch(() => false));

  await browser.close();
})().catch((e) => { console.error('PROBE FAILED:', e); process.exit(1); });