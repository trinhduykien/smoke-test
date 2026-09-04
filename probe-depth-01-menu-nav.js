const { chromium } = require('@playwright/test');

/**
 * PROBE — "Điều hướng qua menu thật" (vòng depth 01-menu-nav)
 * Từ /Home/Index, hover menu cha -> click mục con trong panel -> kiểm URL + title thật.
 * Mục tiêu: "Cấp đơn xe ô tô" (CẤP ĐƠN), "Thanh toán phí" (THANH TOÁN),
 *            "Tra cứu HĐ bảo hiểm" (TIỆN ÍCH).
 */
const BASE = 'https://uat-capdon.pjico.com.vn';

function topMenuToggle(page, menuName) {
  return page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: new RegExp('^\\s*' + menuName + '\\s*$', 'i') })
    .first();
}

function topMenuPanel(page, menuName) {
  return topMenuToggle(page, menuName)
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
}

async function probeNav(browser, label, menuName, itemText, expectUrlPart) {
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200));
  });

  console.log('\n########## ' + label + ' ##########');
  const resp = await page.goto(BASE + '/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('goto status:', resp && resp.status());
  await page.waitForLoadState('load');

  if (await page.locator('#EMAIL').count() > 0) {
    console.log('!! SESSION HẾT HẠN — thấy ô #EMAIL login');
    await ctx.close();
    return;
  }

  // Hover menu cha
  const toggle = topMenuToggle(page, menuName);
  console.log('toggle count:', await page.locator('.dropdown-toggle.name-menu--item').count());
  const tgCount = await toggle.count();
  console.log('toggle "' + menuName + '" count:', tgCount);
  if (tgCount === 0) {
    const allTexts = await page.locator('.dropdown-toggle.name-menu--item').allInnerTexts();
    console.log('các toggle có:', JSON.stringify(allTexts));
    await ctx.close();
    return;
  }
  await toggle.hover();
  const panel = topMenuPanel(page, menuName);
  try {
    await panel.waitFor({ state: 'visible', timeout: 10000 });
    console.log('panel visible OK');
  } catch {
    console.log('panel KHÔNG visible sau hover 10s — thử hover lại');
    await toggle.hover();
    await panel.waitFor({ state: 'visible', timeout: 10000 }).catch(() => console.log('panel vẫn ẩn!'));
  }

  // Tìm mục con trong panel
  const item = panel.getByText(itemText, { exact: true }).first();
  const itemCount = await panel.getByText(itemText, { exact: true }).count();
  console.log('item "' + itemText + '" count trong panel:', itemCount);
  if (itemCount === 0) {
    const panelText = (await panel.innerText().catch(() => '')) || '';
    console.log('panel innerText (300d):', panelText.slice(0, 300));
    await ctx.close();
    return;
  }

  // href của link
  const link = panel.locator('a').filter({ hasText: itemText }).first();
  const href = await link.getAttribute('href').catch(() => '(không phải <a>)');
  console.log('href:', href);

  // Click thật -> điều hướng
  await link.click({ timeout: 30000 });
  await page.waitForLoadState('load').catch(() => {});
  console.log('URL sau click:', page.url());
  console.log('expect URL chứa:', expectUrlPart, '=>', page.url().includes(expectUrlPart));
  const title = await page.title();
  console.log('TITLE:', title);
  await page.waitForTimeout(2000);
  console.log('TITLE sau 2s:', await page.title());
  console.log('URL sau 2s:', page.url());

  // Body heading nổi bật nhất
  const h = await page.locator('h1,h2,h3,.page-title,[class*=title]').allInnerTexts().catch(() => []);
  console.log('headings (10d):', JSON.stringify(h.slice(0, 10)));
  const body = (await page.locator('body').innerText({ timeout: 20000 }).catch(() => '')) || '';
  console.log('body lỗi server?', /Server Error|Runtime Error|Exception/i.test(body));
  console.log('body (200d):', body.slice(0, 200).replace(/\n/g, ' | '));
  console.log('errors:', JSON.stringify(errors.slice(0, 5)));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await probeNav(browser, 'MENU CẤP ĐƠN -> Cấp đơn xe ô tô', 'Cấp đơn', 'Cấp đơn xe ô tô', '/ContractCar/Search');
  await probeNav(browser, 'MENU THANH TOÁN -> Thanh toán phí', 'Thanh toán', 'Thanh toán phí', '/InsuranceFee/SearchPaymentFts');
  await probeNav(browser, 'MENU TIỆN ÍCH -> Tra cứu HĐ bảo hiểm', 'Tiện ích', 'Tra cứu HĐ bảo hiểm', '/Profit/CASearchObjects');
  await browser.close();
})();