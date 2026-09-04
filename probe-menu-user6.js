const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const home = {};
  home.barChart = await page.locator('#bar-chart-dt').isVisible().catch(e => 'err');
  home.kieuSl = await page.locator('#kieu_sl').isVisible().catch(e => 'err');
  home.dtTable = await page.locator('#table-dt1').isVisible().catch(e => 'err');
  home.dtText = await page.getByText('Doanh thu theo tháng', { exact: true }).first().isVisible().catch(e => 'err');
  home.kieuText = await page.getByText('Kiểu số liệu', { exact: true }).first().isVisible().catch(e => 'err');
  home.monthlyRevenueBtn = await page.getByRole('button', { name: 'Xem chi tiết các tháng' }).isVisible().catch(e => 'err');
  home.theoDieuKienBtn = await page.getByRole('button', { name: 'Theo điều kiện chọn' }).isVisible().catch(e => 'err');
  home.highcharts = await page.locator('#bar-chart-dt .highcharts-container').first().isVisible().catch(e => 'err');
  console.log('###HOME###'); console.log(JSON.stringify(home, null, 1));

  await page.goto('https://uat-capdon.pjico.com.vn/Qrcode/SearchQrcode', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const qr = {};
  qr.headingLSL = await page.locator('h1,h2,h3,h4,.page-title,[class*=title]').filter({ hasText: 'Lựa chọn sản phẩm' }).first().isVisible().catch(e => 'err');
  qr.textDanhSach = await page.getByText('DANH SÁCH QRCODE', { exact: true }).first().isVisible().catch(e => 'err');
  qr.btnTao = await page.getByRole('button', { name: 'Tạo QRCODE' }).isVisible().catch(e => 'err');
  qr.btnTim = await page.getByRole('button', { name: 'Tìm Kiếm' }).isVisible().catch(e => 'err');
  qr.selectNV = await page.locator('select#NV').isVisible().catch(e => 'err');
  qr.tableCount = await page.locator('table').count();
  // which heading/text elements are truly visible
  qr.visibleHeadings = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,.page-title,[class*=title]')].filter(h => h.getBoundingClientRect().width > 0 && h.getBoundingClientRect().height > 0).map(h => (h.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 10));
  console.log('###QRCODE###'); console.log(JSON.stringify(qr, null, 1));

  await browser.close();
})();