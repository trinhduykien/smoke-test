import { test, expect } from '@playwright/test';

/**
 * TEST CHIỀU SÂU — Link external & LogOut (CHỈ ASSERT, KHÔNG CLICK)
 * App UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn
 * Session đăng nhập lưu sẵn tại .auth/uat.json
 *
 * Phạm vi (hành vi thật xác nhận bằng probe — probe-depth-10-external-links.js):
 *   1. Footer /Home/Index: link "Chính sách bảo mật"
 *      a[href*='Chinh-sach-bao-mat-thong-tin-ca-nhan'] — href tuyệt đối
 *      https://baohiem.pjico.com.vn/Chinh-sach-bao-mat-thong-tin-ca-nhan,
 *      target=null, rel=null (mở cùng tab — chỉ ghi nhận, KHÔNG fail vì thiếu target=_blank).
 *   2. Footer: mailto customercare.ipjico@petrolimex.com.vn (đúng 1 link).
 *   3. User menu (#pjUserMenuToggle → .profile-menu): 3 link
 *      "Tạo QR cấp đơn" → /Qrcode/SearchQrcode,
 *      "Đổi mật khẩu"    → /Tienich/ChangePassword,
 *      "Đăng xuất"       → /Home/LogOut.
 *
 * AN TOÀN: TUYỆT ĐỐI KHÔNG CLICK link Đăng xuất / Đổi mật khẩu / Tạo QR cấp đơn
 * và KHÔNG CLICK link chính sách bảo mật (chỉ đọc thuộc tính href).
 */

test.use({ viewport: { width: 1600, height: 900 } });

const HOME = '/Home/Index';

/* ============ 1. LINK CHÍNH SÁCH BẢO MẬT (external, domain baohiem.pjico.com.vn) ============ */

test('[EXTERNAL LINKS] Footer có link "Chính sách bảo mật" trỏ đúng domain baohiem.pjico.com.vn', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await page.waitForLoadState('load');

  // Link tồn tại (đúng 1) và hiển thị trong footer
  const policyLink = page.locator("a[href*='Chinh-sach-bao-mat-thong-tin-ca-nhan']");
  await expect(policyLink).toHaveCount(1);
  await expect(policyLink).toBeVisible({ timeout: 30000 });
  await expect(policyLink).toHaveText(/chính sách bảo mật/i);

  // href thuộc tính phải chứa slug chính sách
  const href = (await policyLink.getAttribute('href')) || '';
  expect(href).toMatch(/Chinh-sach-bao-mat-thong-tin-ca-nhan/i);

  // href resolve phải về đúng domain chính thức của PJICO
  const resolved = new URL(href, page.url());
  expect(resolved.protocol).toBe('https:');
  expect(resolved.host).toBe('baohiem.pjico.com.vn');
  expect(resolved.pathname.toLowerCase()).toBe('/chinh-sach-bao-mat-thong-tin-ca-nhan');

  // Ghi nhận thuộc tính target/rel hiện tại (probe: cả hai đều null → mở cùng tab).
  // KHÔNG fail vì thiếu target="_blank" — chỉ là ghi chú, không phải bug nghiêm trọng.
  const target = await policyLink.getAttribute('target');
  const rel = await policyLink.getAttribute('rel');
  console.log(`[notes] policy link target=${JSON.stringify(target)}, rel=${JSON.stringify(rel)} (null = mở cùng tab)`);

  // Không click link — URL phải vẫn ở dashboard
  expect(page.url()).toContain('/Home/Index');
});

/* ============ 2. MAILTO FOOTER ============ */

test('[EXTERNAL LINKS] Footer có mailto customercare.ipjico@petrolimex.com.vn', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await page.waitForLoadState('load');

  // Link mailto tồn tại, hiển thị, đúng địa chỉ email hỗ trợ khách hàng
  const mailtoLink = page.locator("a[href='mailto:customercare.ipjico@petrolimex.com.vn']");
  await expect(mailtoLink).toHaveCount(1);
  await expect(mailtoLink).toBeVisible({ timeout: 30000 });
  await expect(mailtoLink).toHaveText('customercare.ipjico@petrolimex.com.vn');

  // Footer cũng hiển thị nhãn "Email:" cạnh địa chỉ này
  const footer = page.locator('footer');
  await expect(footer).toBeVisible({ timeout: 30000 });
  await expect(footer).toContainText(/email:/i);
  await expect(footer).toContainText('customercare.ipjico@petrolimex.com.vn');
});

/* ============ 3. USER MENU — LINK ĐĂNG XUẤT / ĐỔI MẬT KHẨU / TẠO QR (KHÔNG CLICK) ============ */

test('[EXTERNAL LINKS] User menu có link /Home/LogOut (chỉ assert, KHÔNG click)', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  // Chờ app JS gắn handler cho toggle (click quá sớm sau domcontentloaded có thể bị nuốt)
  await page.waitForLoadState('load');

  // Menu hồ sơ ẩn trước khi bấm
  await expect(page.locator('#pjUserMenuToggle')).toBeVisible({ timeout: 30000 });
  const profileMenu = page.locator('.list-item--menu .profile-menu');
  await expect(profileMenu).toBeHidden();

  // Mở user menu
  await page.locator('#pjUserMenuToggle').click();
  await expect(profileMenu).toBeVisible({ timeout: 30000 });

  // Link "Đăng xuất" trỏ về /Home/LogOut — TUYỆT ĐỐI KHÔNG CLICK
  const logOutLink = profileMenu.locator("a[href='/Home/LogOut']");
  await expect(logOutLink).toHaveCount(1);
  await expect(logOutLink).toBeVisible();
  await expect(logOutLink).toHaveText(/đăng xuất/i);
  // href resolve vẫn ở domain UAT (không phải external)
  const resolved = new URL((await logOutLink.getAttribute('href'))!, page.url());
  expect(resolved.host).toBe('uat-capdon.pjico.com.vn');
  expect(resolved.pathname).toBe('/Home/LogOut');

  // Chưa click gì — vẫn ở dashboard, session còn (không bị đá về login)
  expect(page.url()).toContain('/Home/Index');
  await expect(page.locator('#EMAIL')).toHaveCount(0);
});

test('[EXTERNAL LINKS] User menu có link "Đổi mật khẩu" trỏ /Tienich/ChangePassword (KHÔNG click)', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  await expect(page.locator('#pjUserMenuToggle')).toBeVisible({ timeout: 30000 });
  await page.locator('#pjUserMenuToggle').click();
  const profileMenu = page.locator('.list-item--menu .profile-menu');
  await expect(profileMenu).toBeVisible({ timeout: 30000 });

  // Link "Đổi mật khẩu" — KHÔNG CLICK (trang đổi mật khẩu có form, không bấm gì)
  const changePassLink = profileMenu.locator("a[href='/Tienich/ChangePassword']");
  await expect(changePassLink).toHaveCount(1);
  await expect(changePassLink).toBeVisible();
  await expect(changePassLink).toHaveText(/đổi mật khẩu/i);

  // Chưa rời dashboard
  expect(page.url()).toContain('/Home/Index');
});

test('[EXTERNAL LINKS] User menu có link "Tạo QR cấp đơn" trỏ /Qrcode/SearchQrcode (KHÔNG click)', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  await expect(page.locator('#pjUserMenuToggle')).toBeVisible({ timeout: 30000 });
  await page.locator('#pjUserMenuToggle').click();
  const profileMenu = page.locator('.list-item--menu .profile-menu');
  await expect(profileMenu).toBeVisible({ timeout: 30000 });

  // Link "Tạo QR cấp đơn" — KHÔNG CLICK
  const qrLink = profileMenu.locator("a[href='/Qrcode/SearchQrcode']");
  await expect(qrLink).toHaveCount(1);
  await expect(qrLink).toBeVisible();
  await expect(qrLink).toHaveText(/tạo qr cấp đơn/i);

  // Chưa rời dashboard
  expect(page.url()).toContain('/Home/Index');
});