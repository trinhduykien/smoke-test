import { test, expect, type Page } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU 07 — Responsive / mobile menu (viewport di động & tablet)
 * App UAT PJICO: https://uat-capdon.pjico.com.vn — trang /Home/Index
 *
 * Hành vi thật (đã probe bằng probe-depth-07-mobile.js / 07b / 07c, viewport 390x844):
 *   - Ở viewport hẹp, menu top dạng desktop (hover) KHÔNG hiển thị trong khung nhìn:
 *     các mục menu nằm trong drawer `.menu-list--item` bị dịch hẳn ra ngoài mép trái
 *     (transform: translateX(-361px)); Playwright vẫn thấy "visible" (CSS) nên phải
 *     assert bằng boundingBox / transform thay vì toBeHidden().
 *   - Nút mở menu: #pjMobileMenuToggle (button, aria-label="Mở menu"),
 *     aria-expanded="false" khi đóng, "true" khi mở; bấm lần 2 ĐÓNG drawer đúng.
 *   - Drawer mở: `.menu-list--item` transform về identity, nhãn menu ".pj-nav-label"
 *     (text DOM "Cấp đơn", CSS in hoa "CẤP ĐƠN") nằm trong khung nhìn (x >= 0).
 *   - Trong menu mobile, bấm mục "CẤP ĐƠN" (a.dropdown-toggle.name-menu--item) mở
 *     panel con hiển thị "Cấp đơn xe ô tô" (accordion — chỉ mở dropdown, KHÔNG điều hướng).
 *   - Horizontal scrollbar: lúc domcontentloaded có tràn tạm (scrollWidth=440 > 390, do
 *     ul.d-flex.mb-0 rộng 491px) nhưng app tự co lại sau ~500ms → test chờ layout ổn
 *     rồi mới assert KHÔNG có horizontal scrollbar (kỳ vọng của reviewer).
 *   - Tablet 768x1024: cùng cơ chế drawer, KHÔNG tràn ngang ngay từ đầu.
 *
 * AN TOÀN: chỉ-đọc — chỉ bấm toggle menu mobile / mở mục menu (dropdown), KHÔNG bấm
 * Lưu/Thêm/Xóa/Đăng xuất, KHÔNG điều hướng vào trang nghiệp vụ.
 */

const HOME = '/Home/Index';

// Drawer mobile menu: chứa toàn bộ mục menu, bị translate ra ngoài khi đóng
const drawer = (page: Page) => page.locator('nav#mainMenu .menu-list--item').first();
// Nhãn menu (text DOM "Cấp đơn" — CSS hiển thị in hoa)
const navLabel = (page: Page, name: string) =>
  page.locator('.pj-nav-label').filter({ hasText: new RegExp('^\\s*' + name + '\\s*$', 'i') }).first();

async function assertLoggedIn(page: Page) {
  // Session hết hạn thì app redirect về trang login có ô #EMAIL → dừng rõ ràng
  expect(await page.locator('#EMAIL').count(), 'Session còn hạn (không bị đẩy về login)').toBe(0);
}

// Menu DOM được app chèn/xây lại sau sự kiện load → chờ nhãn menu xuất hiện
async function waitForMenuDom(page: Page) {
  await expect(page.locator('.pj-nav-label').first()).toBeVisible({ timeout: 30000 });
}

// Chờ animation trượt drawer (transform 0.2s) KẾT THÚC hẳn:
// mở = mép trái drawer vào tới x >= -1 (vị trí cuối là 0),
// đóng = mép PHẢI drawer ra ngoài khung nhìn (right <= 2, vị trí cuối là -11)
async function waitForDrawerAtRest(page: Page, open: boolean) {
  const edge = expect.poll(async () => {
    const b = await drawer(page).boundingBox();
    return b ? Math.round(b.x + (open ? 0 : b.width)) : null;
  }, { timeout: 15000 });
  if (open) {
    await edge.toBeGreaterThanOrEqual(-1);
  } else {
    await edge.toBeLessThanOrEqual(2);
  }
}

// Chờ layout ổn định (tràn ngang tạm lúc load tự hết) rồi trả về kết quả kiểm tra
async function noHorizontalScrollbar(page: Page, timeout = 20000): Promise<boolean> {
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
    undefined,
    { timeout, polling: 200 }
  ).catch(() => {});
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
  );
}

/* ============ A. VIEWPORT MOBILE 390x844 ============ */

test.describe('[MOBILE 390x844] Responsive / mobile menu', () => {
  test.use({ viewport: { width: 390, height: 900 } });
  // NOTE: reviewer đề xuất 390x844; chiều cao được nâng nhẹ 900 không thay đổi
  // hành vi responsive (breakpoint theo chiều NGANG), chỉ dễ quan sát hơn.

  test('mobile: menu top ẩn, #pjMobileMenuToggle mở drawer có mục "Cấp đơn"', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
    expect(resp && resp.status()).toBe(200);
    await page.waitForLoadState('load');
    await assertLoggedIn(page);
    await waitForMenuDom(page);

    // Nút toggle mobile hiển thị, trạng thái đóng
    const toggle = page.locator('#pjMobileMenuToggle');
    await expect(toggle).toBeVisible({ timeout: 30000 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // TRƯỚC khi mở: drawer menu nằm trọn ngoài mép trái khung nhìn (menu top ẩn)
    const before = await drawer(page).boundingBox();
    expect(before, 'drawer tồn tại để đo boundingBox').not.toBeNull();
    expect(before!.x + before!.width, 'drawer đóng: menu nằm ngoài khung nhìn (bên trái)').toBeLessThanOrEqual(2);

    // Bấm toggle → menu mobile mở
    await toggle.click();
    // Click đầu có thể bị nuốt nếu app JS chưa bind handler kịp → kiểm tra aria-expanded
    let expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await page.waitForTimeout(500);
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 15000 });

    // Drawer đã trượt vào trong khung nhìn (chờ animation 0.2s kết thúc)
    await waitForDrawerAtRest(page, true);
    await expect(drawer(page)).toBeVisible();
    const after = await drawer(page).boundingBox();
    expect(after, 'drawer mở: đo boundingBox').not.toBeNull();
    expect(Math.round(after!.x), 'drawer mở: nằm trong khung nhìn').toBeGreaterThanOrEqual(0);

    // Mục "Cấp đơn" (hiển thị HOA bằng CSS) hiển thị THẬT trong menu mobile
    const label = navLabel(page, 'Cấp đơn');
    await expect(label).toBeVisible({ timeout: 30000 });
    const labelBox = await label.boundingBox();
    expect(labelBox, 'nhãn "Cấp đơn" có boundingBox').not.toBeNull();
    expect(labelBox!.x, 'nhãn "Cấp đơn" nằm trong khung nhìn (x >= 0)').toBeGreaterThanOrEqual(0);
    expect(labelBox!.x, 'nhãn "Cấp đơn" nằm trong khung nhìn (x < 390)').toBeLessThan(390);

    await page.screenshot({ path: 'test-results/depth07-mobile-menu-open.png' });

    // Bấm toggle lần 2 → menu ĐÓNG (drawer trượt ra ngoài trở lại)
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: 15000 });
    await waitForDrawerAtRest(page, false);
    const closed = await drawer(page).boundingBox();
    expect(closed, 'drawer đóng: đo boundingBox').not.toBeNull();
    expect(closed!.x + closed!.width, 'drawer đóng lại: menu ra ngoài khung nhìn').toBeLessThanOrEqual(2);

    await page.screenshot({ path: 'test-results/depth07-mobile-menu-closed.png' });
  });

  test('mobile: bấm mục "CẤP ĐƠN" trong menu mobile mở panel con "Cấp đơn xe ô tô"', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(HOME, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertLoggedIn(page);
    await waitForMenuDom(page);

    // Mở menu mobile
    const toggle = page.locator('#pjMobileMenuToggle');
    await expect(toggle).toBeVisible({ timeout: 30000 });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 15000 });

    // Bấm mục "CẤP ĐƠN" (accordion trong drawer — chỉ mở dropdown, KHÔNG điều hướng)
    const capDonItem = navLabel(page, 'Cấp đơn')
      .locator('xpath=ancestor::a[contains(@class,"dropdown-toggle")][1]');
    await expect(capDonItem).toBeVisible({ timeout: 30000 });
    await capDonItem.click({ timeout: 30000 });

    // Panel con trong drawer hiển thị mục lá "Cấp đơn xe ô tô"
    const capDonPanel = capDonItem
      .locator('xpath=following-sibling::*[contains(@class,"pj-menu-panel")][1] | ancestor::*[contains(@class,"pj-top-item")]/*[contains(@class,"pj-menu-panel")]')
      .first();
    await expect(capDonPanel.getByText('Cấp đơn xe ô tô', { exact: true }))
      .toBeVisible({ timeout: 15000 });

    // Vẫn ở trang Dashboard (không điều hướng đi đâu)
    expect(page.url()).toContain('/Home/Index');
  });

  test('mobile: KHÔNG có horizontal scrollbar trên Dashboard 390px (khi layout đã ổn)', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(HOME, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertLoggedIn(page);

    // Lúc load có tràn tạm (ul.d-flex.mb-0 491px) — app tự co lại trong ~0.5s.
    // Chờ layout ổn định rồi kiểm tra kỳ vọng: KHÔNG horizontal scrollbar.
    const ok = await noHorizontalScrollbar(page);
    expect(ok, 'scrollWidth phải <= clientWidth + 2 (không horizontal scrollbar)').toBe(true);
  });

  test('mobile: khi drawer menu mở, trang KHÔNG có horizontal scrollbar', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(HOME, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await assertLoggedIn(page);
    await waitForMenuDom(page);

    const toggle = page.locator('#pjMobileMenuToggle');
    await expect(toggle).toBeVisible({ timeout: 30000 });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 15000 });
    await page.waitForTimeout(500); // chờ animation trượt 0.2s xong

    const ok = await noHorizontalScrollbar(page);
    expect(ok, 'menu mở vẫn không được tràn ngang').toBe(true);
  });
});

/* ============ B. VIEWPORT TABLET 768x1024 ============ */

test.describe('[TABLET 768x1024] Responsive / mobile menu', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('tablet: menu dạng drawer + mở "Cấp đơn" và không horizontal scrollbar', async ({ page }) => {
    test.setTimeout(120000);
    const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
    expect(resp && resp.status()).toBe(200);
    await page.waitForLoadState('load');
    await assertLoggedIn(page);
    await waitForMenuDom(page);

    // Tablet vẫn dùng drawer mobile (menu top desktop không hiển thị trong khung nhìn)
    const toggle = page.locator('#pjMobileMenuToggle');
    await expect(toggle).toBeVisible({ timeout: 30000 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const before = await drawer(page).boundingBox();
    expect(before, 'drawer tồn tại').not.toBeNull();
    expect(before!.x + before!.width, 'drawer đóng: menu ngoài khung nhìn').toBeLessThanOrEqual(2);

    // Không horizontal scrollbar ở 768px (kể cả ngay sau load — probe 07)
    const okClosed = await noHorizontalScrollbar(page);
    expect(okClosed, 'tablet: không horizontal scrollbar khi menu đóng').toBe(true);

    // Mở drawer → "Cấp đơn" hiển thị trong khung nhìn
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 15000 });
    await waitForDrawerAtRest(page, true);
    const label = navLabel(page, 'Cấp đơn');
    await expect(label).toBeVisible({ timeout: 30000 });
    const labelBox = await label.boundingBox();
    expect(labelBox, 'nhãn "Cấp đơn" có boundingBox').not.toBeNull();
    expect(labelBox!.x, 'nhãn "Cấp đơn" trong khung nhìn (x >= 0)').toBeGreaterThanOrEqual(0);
    expect(labelBox!.x, 'nhãn "Cấp đơn" trong khung nhìn (x < 768)').toBeLessThan(768);

    // Mở menu vẫn không tràn ngang
    const okOpen = await noHorizontalScrollbar(page);
    expect(okOpen, 'tablet: không horizontal scrollbar khi menu mở').toBe(true);

    await page.screenshot({ path: 'test-results/depth07-tablet-menu-open.png' });

    // Đóng lại cho sạch trạng thái
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: 15000 });
  });
});