// PROBE API — ContractCar (bổ sung: xem grid row khi Total=0 + form filter)
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/ContractCar/Search', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(2500);

  // form filter: select/input trong khu vực tìm kiếm
  console.log('select count:', await page.locator('select').count());
  console.log('input count:', await page.locator('form input:visible').count());
  const inputs = await page.locator('form input:visible').all();
  for (const i of inputs.slice(0, 12)) {
    console.log('  input:', await i.getAttribute('id'), '|', await i.getAttribute('name'), '| type=', await i.getAttribute('type'), '| value=', await i.inputValue().catch(() => '?'));
  }
  // grid sau khi bấm tìm
  await page.locator('button.btn-blue').first().click();
  await page.waitForTimeout(2500);
  const grid = page.locator('table:visible').first();
  const rows = grid.locator('tbody tr');
  console.log('rows:', await rows.count());
  for (let i = 0; i < await rows.count(); i++) {
    console.log(`  row[${i}] text:`, JSON.stringify((await rows.nth(i).innerText()).replace(/\s+/g, ' ').trim()).slice(0, 200));
    console.log(`  row[${i}] html:`, (await rows.nth(i).innerHTML()).replace(/\s+/g, ' ').slice(0, 300));
  }
  // thử chọn từ ngày xa để có dữ liệu?
  const tuNgay = page.locator('input[id*=tu], input[name*=tu]').first();
  console.log('tuNgay exists:', await tuNgay.count());
  await browser.close();
})();
