const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2000);
  const modal = page.locator('#modal_MonthlyRevenue');
  const openBtn = page.locator('button.btn-filter-update', { hasText: /xem chi tiết các tháng/i });

  // Kiểm tra bootstrap + khởi tạo modal trong JS trang
  const bsInfo = await page.evaluate(() => ({
    hasBootstrap: typeof window.jQuery !== 'undefined' && typeof jQuery.fn.modal,
    modalData: (typeof jQuery !== 'undefined' && jQuery('#modal_MonthlyRevenue').data('bs.modal')) ? {
      keyboard: jQuery('#modal_MonthlyRevenue').data('bs.modal').options.keyboard,
      backdrop: jQuery('#modal_MonthlyRevenue').data('bs.modal').options.backdrop,
    } : null,
  }));
  console.log('bootstrap info:', JSON.stringify(bsInfo));

  // Escape khi focus TRONG modal
  await openBtn.click();
  await page.waitForTimeout(1200);
  console.log('modal mở:', await modal.isVisible());
  await modal.locator('h4.modal-title').click(); // đưa focus vào trong modal
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  console.log('Escape (focus trong modal) → modal visible?', await modal.isVisible());
  console.log('classes:', await modal.getAttribute('class'));

  // backdrop có data-dismiss?
  console.log('.modal-backdrop count:', await page.locator('.modal-backdrop').count());
  const bk = page.locator('.modal-backdrop').first();
  if (await page.locator('.modal-backdrop').count()) {
    console.log('backdrop outerHTML:', (await bk.evaluate(e => e.outerHTML)).slice(0, 300));
  }

  // đóng lại bằng .close để dọn trạng thái
  await modal.locator('.close').click();
  await page.waitForTimeout(1200);
  console.log('sau .close → visible?', await modal.isVisible());
  console.log('backdrop còn lại:', await page.locator('.modal-backdrop').count());

  await browser.close();
})();