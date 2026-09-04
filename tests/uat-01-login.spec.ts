import { test, expect } from '@playwright/test';

/**
 * BƯỚC 1 — Test đăng nhập UAT: https://uat-capdon.pjico.com.vn
 * Tài khoản: doc tu .env (UAT_EMAIL / UAT_PASS)
 *
 * Luồng 2 bước:
 *   1) Nhập email → bấm mũi tên (#email_click .show-password) → hiện ô mật khẩu (#DIV_LOGIN)
 *   2) Nhập mật khẩu → bấm "ĐĂNG NHẬP" → vào màn hình chính
 */

// Test luồng đăng nhập cần phiên trống — không dùng session đã lưu trong .auth/uat.json
test.use({ storageState: { cookies: [], origins: [] } });

const LOGIN_URL = 'https://uat-capdon.pjico.com.vn/Home/Index';
const EMAIL = process.env.UAT_EMAIL || '';
const PASS = process.env.UAT_PASS || '';

test('đăng nhập UAT thành công bằng tài khoản hợp lệ', async ({ page }) => {
  test.setTimeout(150000);

  // Mở trang đăng nhập
  await page.goto(LOGIN_URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await expect(page.locator('#EMAIL')).toBeVisible({ timeout: 30000 });
  console.log('Đã mở trang đăng nhập:', page.url());

  // Bước 1: email → mũi tên
  await page.locator('#EMAIL').fill(EMAIL);
  await page.locator('#email_click .show-password').click();
  await expect(page.locator('#DIV_LOGIN')).toBeVisible({ timeout: 30000 });
  console.log('Ô mật khẩu đã hiện ra sau khi nhập email hợp lệ');

  // Bước 2: mật khẩu → ĐĂNG NHẬP
  await page.locator('input[type=password]').first().fill(PASS);
  await page.getByRole('link', { name: /ĐĂNG NHẬP/i })
    .or(page.getByRole('button', { name: /ĐĂNG NHẬP/i }))
    .first().click();

  // Kỳ vọng: rời khỏi trang login, không còn ô email
  await page.waitForURL(u => !/login/i.test(u.href), { timeout: 90000 });
  console.log('URL sau đăng nhập:', page.url());
  await expect(page.locator('#EMAIL')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/uat-login-success.png', fullPage: false });
});



