const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  async function tryMenu(name, childText) {
    const toggle = page.locator('.dropdown-toggle.name-menu--item').filter({ hasText: new RegExp('^' + name + '$', 'i') }).first();
    const topItem = toggle.locator('xpath=ancestor::*[contains(@class,"pj-top-item")]');
    const panel = topItem.locator('.pj-menu-panel').first();
    const link = panel.getByText(childText, { exact: false }).first();
    const result = { name };
    result.panelVisibleBeforeHover = await panel.isVisible().catch(() => 'err');
    await toggle.hover({ timeout: 10000 });
    await page.waitForTimeout(2000);
    result.panelVisibleAfterHover = await panel.isVisible().catch(() => 'err');
    result.linkVisibleAfterHover = await link.isVisible().catch(() => 'err');
    if (!result.linkVisibleAfterHover) {
      await toggle.click({ timeout: 10000 }).catch(e => result.clickErr = e.message.slice(0, 100));
      await page.waitForTimeout(2000);
      result.panelVisibleAfterClick = await panel.isVisible().catch(() => 'err');
      result.linkVisibleAfterClick = await link.isVisible().catch(() => 'err');
    }
    // dump panel content sample
    result.panelText = await topItem.locator('.pj-menu-panel').first().evaluate(el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 150)).catch(() => null);
    console.log(JSON.stringify(result));
  }

  await tryMenu('Bồi thường', 'Tim ho so FTS');
  await page.waitForTimeout(1500);
  await tryMenu('Tái bảo hiểm', 'Phân bổ tỷ lệ tái');
  await page.waitForTimeout(1500);
  // retry tái bảo hiểm fresh reload
  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await tryMenu('Tái bảo hiểm', 'Phân bổ tỷ lệ tái');

  // also test one mega panel again after another was open (interference check)
  await tryMenu('Cấp đơn', 'Cấp đơn xe ô tô');

  // profile menu playwright-visibility before click
  const prof = page.locator('.list-item--menu .profile-menu');
  const profBefore = await prof.isVisible().catch(() => 'err');
  const qrBefore = await page.getByText('Tạo QR cấp đơn', { exact: true }).isVisible().catch(() => 'err');
  await page.locator('#pjUserMenuToggle').click({ timeout: 10000 });
  await page.waitForTimeout(1000);
  const profAfter = await prof.isVisible().catch(() => 'err');
  const qrAfter = await page.getByText('Tạo QR cấp đơn', { exact: true }).isVisible().catch(() => 'err');
  const dpAfter = await page.getByText('Đổi mật khẩu', { exact: true }).first().isVisible().catch(() => 'err');
  const dxAfter = await page.getByText('Đăng xuất', { exact: true }).first().isVisible().catch(() => 'err');
  console.log('###PROFILE### profBefore=' + profBefore + ' qrBefore=' + qrBefore + ' profAfter=' + profAfter + ' qrAfter=' + qrAfter + ' dpAfter=' + dpAfter + ' dxAfter=' + dxAfter);

  await browser.close();
})();