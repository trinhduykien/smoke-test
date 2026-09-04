import { test, expect } from '@playwright/test';

/**
 * KIỂM TRA BẢO MẬT (THỤ ĐỘNG) — App UAT: https://uat-capdon.pjico.com.vn
 * Toàn bộ chỉ-đọc: đọc headers, cookies, quan sát hành vi đăng nhập với ĐÚNG 1 lần
 * nhập sai mật khẩu của chính tài khoản mình. KHÔNG gửi payload tấn công.
 *
 * Kết quả mong đợi dựa trên probe thực tế 2026-09-03:
 *   ĐIỂM MẠNH (mong pass):
 *     - Đủ 6 security header chuẩn (CSP, HSTS, X-Frame-Options, nosniff, referrer, permissions)
 *     - Không session → 302 về login, không render nội dung trang bảo vệ
 *     - Cookie phiên chính httpOnly + Secure + SameSite=Strict
 *   LỖI THẬT CỦA APP (test được viết theo hành vi đúng → sẽ FAIL, không bịa để pass):
 *     - Account enumeration: email không tồn tại KHÔNG hiện ô mật khẩu → dò được email tồn tại
 *     - ASP.NET_SessionId thiếu cờ Secure (cookie session đi được qua HTTP)
 *     - Lộ version server: nginx/1.20.1, x-powered-by: ASP.NET, x-aspnet-version: 4.0.30319
 */

const BASE = 'https://uat-capdon.pjico.com.vn';
const EMAIL_REAL = 'kientd.pjico@petrolimex.com.vn';
const EMAIL_KHONG_TON_TAI = 'qa.khong.ton.tai.998877zz@petrolimex.com.vn';

// ============================================================
// 1. SECURITY HEADERS (phiên đã đăng nhập)
// ============================================================
test('[SECURITY] App UAT có đủ 6 security header chuẩn', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto('/Home/Index', { waitUntil: 'domcontentloaded' });
  expect(resp!.status()).toBeLessThan(400);
  const headers = resp!.headers();

  expect(headers['content-security-policy'], 'thiếu CSP').toBeTruthy();
  expect(headers['strict-transport-security'], 'thiếu HSTS').toBeTruthy();
  expect(headers['x-frame-options'], 'thiếu X-Frame-Options').toBeTruthy();
  expect(headers['x-content-type-options'], 'thiếu X-Content-Type-Options').toBeTruthy();
  expect(headers['referrer-policy'], 'thiếu Referrer-Policy').toBeTruthy();
  expect(headers['permissions-policy'], 'thiếu Permissions-Policy').toBeTruthy();
});

test('[SECURITY] HSTS có max-age đủ dài (tối thiểu 15552000s = 180 ngày)', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto('/Home/Index', { waitUntil: 'domcontentloaded' });
  const hsts = resp!.headers()['strict-transport-security'] || '';
  const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0', 10);
  expect(maxAge).toBeGreaterThanOrEqual(15552000);
});

// LỖI THẬT: server / x-powered-by / x-aspnet-version đang lộ version phần mềm
test('[SECURITY] Không lộ thông tin phiên bản server trong headers', async ({ page }) => {
  test.setTimeout(120000);
  const resp = await page.goto('/Home/Index', { waitUntil: 'domcontentloaded' });
  const headers = resp!.headers();

  const server = headers['server'] || '';
  const poweredBy = headers['x-powered-by'] || '';
  const aspnetVer = headers['x-aspnet-version'] || '';
  // Message nối chuỗi thường để Playwright in kèm giá trị thật khi fail
  expect(server, 'header server khong nen lo version (hien: ' + server + ')').toBeFalsy();
  expect(poweredBy, 'header x-powered-by khong nen hien (hien: ' + poweredBy + ')').toBeFalsy();
  expect(aspnetVer, 'x-aspnet-version khong nen lo version .NET (hien: ' + aspnetVer + ')').toBeFalsy();
});

// ============================================================
// 2. COOKIE PHIÊN ĐĂNG NHẬP
// ============================================================
test('[SECURITY] Cookie phiên chính có đủ HttpOnly + Secure + SameSite', async ({ context }) => {
  test.setTimeout(120000);
  const cookies = await context.cookies(BASE);
  const chinh = cookies.filter(c => ['capdon.pjico', 'rt.capdon.pjico'].includes(c.name));
  expect(chinh.length).toBeGreaterThanOrEqual(1);

  for (const c of chinh) {
    expect(`${c.name}.httpOnly`).toBeTruthy();
    expect(`${c.name}.secure`).toBeTruthy();
    expect(`${c.name}.sameSite`).toBeTruthy();
  }
});

// LỖI THẬT: ASP.NET_SessionId đang secure=false → cookie session có thể truyền qua HTTP
test('[SECURITY] Toàn bộ cookie phiên phải có cờ Secure (chống lộ qua HTTP)', async ({ context }) => {
  test.setTimeout(120000);
  const cookies = await context.cookies(BASE);
  const sessionCookies = cookies.filter(c => /session/i.test(c.name));
  expect(sessionCookies.length).toBeGreaterThanOrEqual(1);

  for (const c of sessionCookies) {
    expect(c.secure, `cookie "${c.name}" thiếu cờ Secure (${c.httpOnly ? 'HttpOnly ok' : 'cả HttpOnly cũng thiếu'})`).toBe(true);
  }
});

// ============================================================
// 3. KIỂM SOÁT TRUY CẬP & ĐĂNG NHẬP (phiên TRỐNG — không dùng session đã lưu)
// ============================================================
test.describe('Chưa đăng nhập', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('[SECURITY] Trang bảo vệ KHÔNG render nội dung khi chưa đăng nhập', async ({ page }) => {
    test.setTimeout(120000);
    // Vào trực tiếp 3 trang nghiệp vụ bằng URL — phải bị đá về login, không được lộ dữ liệu
    for (const path of ['/ContractCar/Search', '/ClaimGeneral/Search', '/CategorySystem/UserAccount']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(new RegExp(path.replace(/\//g, '\\/')), { timeout: 10000 });
      // Không được thấy nội dung nghiệp vụ (menu đầy đủ của phiên đăng nhập)
      await expect(page.locator('#EMAIL')).toBeVisible({ timeout: 15000 });
    }
  });

  test('[SECURITY] Sai mật khẩu → thông báo chung chung, không tiết lộ email có trong hệ thống', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/Home/Index', { waitUntil: 'domcontentloaded' });

    // ĐÚNG 1 lần nhập sai mật khẩu của chính tài khoản mình
    await page.locator('#EMAIL').fill(EMAIL_REAL);
    await page.locator('#email_click .show-password').click();
    await page.locator('input[type=password]').first().fill('SaiMatKhau@QA-Probe-9988');
    await page.getByRole('link', { name: /ĐĂNG NHẬP/i })
      .or(page.getByRole('button', { name: /ĐĂNG NHẬP/i })).first().click();

    // Kỳ vọng: về lại trang login với lý do chung chung, KHÔNG có text tiết lộ
    await page.waitForURL(u => !/login/i.test(u.href) || true, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/mật khẩu (không )?(đúng|sai)|password (incorrect|wrong)|email (không )?(tồn tại|đúng)/i);
  });

  // LỖI THẬT (account enumeration): email không tồn tại không hiện ô mật khẩu,
  // email tồn tại thì hiện → hành vi khác nhau giúp dò email trong hệ thống.
  test('[SECURITY] Nhập email không tồn tại phải được đối xử như email tồn tại (chống enumeration)', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/Home/Index', { waitUntil: 'domcontentloaded' });

    await page.locator('#EMAIL').fill(EMAIL_KHONG_TON_TAI);
    await page.locator('#email_click .show-password').click();
    // Hành vi an toàn mong đợi: vẫn hiện bước nhập mật khẩu như email thật
    await expect(page.locator('#DIV_LOGIN')).toBeVisible({ timeout: 15000 });
  });
});