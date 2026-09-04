import { test, expect, type Page } from '@playwright/test';

/**
 * DEPTH TEST — Menu "THÊM" (overflow) — khu vực 08-more-menu
 * App UAT cấp đơn bảo hiểm PJICO: https://uat-capdon.pjico.com.vn
 * Tài khoản: kientd.pjico@petrolimex.com.vn (session lưu sẵn .auth/uat.json)
 *
 * Phạm vi (CHỈ ĐỌC — KHÔNG bấm nút Lưu/Thêm/Xóa/Đăng xuất):
 *   Ở viewport 1280x900, một số phân hệ menu tràn khỏi thanh menu và được gộp
 *   vào nút "THÊM" (a.pj-more-toggle). Kiểm tra:
 *     1. Nút THÊM hiển thị, panel ẩn ban đầu (aria-expanded="false")
 *     2. Click THÊM → panel "Các phân hệ khác" hiện ít nhất 1 mục menu
 *     3. Tổng số link menu TRƯỚC/SAU khi mở panel bằng nhau — không phân hệ nào MẤT
 *     4. Click mục "Hệ thống mã" trong panel THÊM → mở dropdown của phân hệ đó
 *     5. Click THÊM lần 2 → panel đóng lại
 *     6. Sau khi đã dùng THÊM, hover menu chính vẫn hoạt động bình thường
 *
 * Hành vi thật (quan sát bằng probe — probe-depth-08-more-menu.js / 08b / 08c):
 *   - Menu top bar render bằng JS SAU khi trang load → phải chờ
 *     ".dropdown-toggle.name-menu--item" xuất hiện rồi mới đếm/tương tác.
 *   - Nút THÊM: <a class="name-menu--item pj-more-toggle">, cha là li.pj-more-item,
 *     panel là ".pj-menu-panel--more" chứa heading "Các phân hệ khác" và các
 *     button.pj-more-link (KHÔNG phải <a>) — "Hệ thống mã", "Báo cáo".
 *   - Click button.pj-more-link KHÔNG điều hướng: nó ĐÓNG panel THÊM và mở
 *     panel dropdown của phân hệ tràn tương ứng (toggle gốc bị ẩn vì tràn).
 *   - Ở viewport 1600x900 menu vừa đủ → nút THÊM không hiển thị (đối chứng).
 */

// Viewport 1280x900 là viewport CHÍNH của vòng test này — menu bị tràn vào THÊM
test.use({ viewport: { width: 1280, height: 900 } });

const HOME = '/Home/Index';

/* ============================ HELPERS ============================ */

// Chờ menu top bar render xong (JS dựng menu sau khi trang load;
// logic gộp mục tràn vào "THÊM" cũng chạy trong bước này)
async function waitMenuReady(page: Page) {
  await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page
    .locator('.dropdown-toggle.name-menu--item')
    .first()
    .waitFor({ state: 'visible', timeout: 60000 });
}

// Nút "THÊM" (overflow)
function moreToggle(page: Page) {
  return page.locator('a.pj-more-toggle').first();
}

// Panel "Các phân hệ khác" nằm trong cùng li.pj-more-item với nút THÊM
function morePanel(page: Page) {
  return page.locator('.pj-menu-panel--more').first();
}

// Click THÊM và chờ panel mở — nếu click đầu bị nuốt (handler JS chưa bind
// kịp ngay sau render menu) thì click lại lần 2 (quan sát thấy ở vòng trước
// với #pjMenuSearchToggle)
async function openMorePanel(page: Page) {
  await moreToggle(page).click();
  try {
    await expect(morePanel(page)).toBeVisible({ timeout: 5000 });
  } catch {
    await moreToggle(page).click();
  }
  await expect(morePanel(page)).toBeVisible({ timeout: 30000 });
}

// Đếm TẤT cả <a> đang có trong DOM của các thanh menu (nav + .menu),
// kể cả mục đang ẩn (tràn vào THÊM). Trả về tổng số + bộ key "text::href"
// để so sánh trước/sau — mục menu không được MẤT hay bị nhân đôi.
async function navLinkSnapshot(page: Page) {
  return page.evaluate(() => {
    const seen = new Set<Element>();
    const keys: string[] = [];
    document.querySelectorAll('nav, .menu').forEach((root) => {
      root.querySelectorAll('a').forEach((a) => {
        if (!seen.has(a)) {
          seen.add(a);
          const text = (a.innerText || '').replace(/\s+/g, ' ').trim();
          keys.push(`${text}::${a.getAttribute('href')}`);
        }
      });
    });
    return { total: keys.length, keys };
  });
}

/* ================= 1. NÚT THÊM HIỂN THỊ, PANEL ẨN ================= */

test('[THÊM] Viewport 1280x900: nút THÊM hiển thị, panel ẩn, aria-expanded="false"', async ({ page }) => {
  test.setTimeout(120000);
  await waitMenuReady(page);

  // Menu tràn → nút THÊM phải hiển thị
  await expect(moreToggle(page)).toBeVisible({ timeout: 30000 });

  // Trước khi bấm: panel "Các phân hệ khác" ẩn, trạng thái aria là thu gọn
  await expect(morePanel(page)).toBeHidden();
  expect(await moreToggle(page).getAttribute('aria-expanded')).toBe('false');
});

/* ============ 2. CLICK THÊM → PANEL HIỆN ÍT NHẤT 1 MỤC MENU ============ */

test('[THÊM] Click THÊM mở panel "Các phân hệ khác" với ít nhất 1 mục menu', async ({ page }) => {
  test.setTimeout(120000);
  await waitMenuReady(page);
  await expect(moreToggle(page)).toBeVisible({ timeout: 30000 });

  await openMorePanel(page);

  // Panel mở: nút THÊM chuyển sang trạng thái xổ xuống
  expect(await moreToggle(page).getAttribute('aria-expanded')).toBe('true');

  // Heading của panel (text DOM "Các phân hệ khác", CSS hiển thị HOA)
  await expect(
    morePanel(page).getByText(/các phân hệ khác/i).first()
  ).toBeVisible({ timeout: 30000 });

  // Phải có ít nhất 1 mục menu tràn trong panel — probe thấy 2 mục
  // ("Hệ thống mã", "Báo cáo") dạng button.pj-more-link
  const moreLinks = morePanel(page).locator('button.pj-more-link');
  await expect(moreLinks.first()).toBeVisible({ timeout: 30000 });
  expect(await moreLinks.count()).toBeGreaterThanOrEqual(1);

  // Ít nhất một phân hệ tràn phải có thật theo probe: "Hệ thống mã"
  await expect(
    moreLinks.filter({ hasText: /hệ thống mã/i }).first()
  ).toBeVisible({ timeout: 30000 });
});

/* ==== 3. TỔNG SỐ LINK MENU TRƯỚC/SAU BẰNG NHAU — KHÔNG MỤC NÀO MẤT ==== */

test('[THÊM] Mở panel THÊM không làm MẤT link menu nào (tổng trước = tổng sau)', async ({ page }) => {
  test.setTimeout(120000);
  await waitMenuReady(page);
  await expect(moreToggle(page)).toBeVisible({ timeout: 30000 });

  // Đếm tổng số link menu TRƯỚC khi mở panel THÊM
  const before = await navLinkSnapshot(page);
  expect(before.total).toBeGreaterThan(0); // sanity: menu đã render
  console.log('Tổng link menu trước khi mở THÊM:', before.total);

  await openMorePanel(page);

  // Panel mở → đếm lại
  await expect(morePanel(page).locator('button.pj-more-link').first()).toBeVisible({ timeout: 30000 });
  const after = await navLinkSnapshot(page);
  console.log('Tổng link menu sau khi mở THÊM:', after.total);

  // Tổng số link menu phải BẰNG NHAU — không mục nào bị mất đi khi tràn
  expect(after.total, 'Tổng số link menu trước/sau phải bằng nhau').toBe(before.total);

  // So sánh theo từng mục (text::href): không item nào biến mất
  const beforeKeys = new Set(before.keys);
  const afterKeys = new Set(after.keys);
  const lost = [...beforeKeys].filter((k) => !afterKeys.has(k));
  expect(lost, `Không link menu nào được phép MẤT sau khi mở THÊM: ${JSON.stringify(lost)}`).toEqual([]);
});

/* ===== 4. CLICK "HỆ THỐNG MÃ" TRONG THÊM → MỞ DROPDOWN PHÂN HỆ TRÀN ===== */

test('[THÊM] Click "Hệ thống mã" trong panel THÊM mở dropdown của phân hệ đó', async ({ page }) => {
  test.setTimeout(120000);
  await waitMenuReady(page);
  await openMorePanel(page);

  // Toggle gốc của "Hệ thống mã" đang bị ẩn khỏi thanh menu (vì tràn)…
  const htmTopToggle = page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: /hệ thống mã/i })
    .first();
  await expect(htmTopToggle).toBeHidden();

  // …nhưng vẫn truy cập được qua panel THÊM
  const htmMoreLink = morePanel(page)
    .locator('button.pj-more-link')
    .filter({ hasText: /hệ thống mã/i })
    .first();
  await expect(htmMoreLink).toBeVisible({ timeout: 30000 });

  // Click là hành vi mở dropdown (KHÔNG điều hướng — probe xác nhận URL giữ nguyên)
  const urlBefore = page.url();
  await htmMoreLink.click();

  // Panel THÊM tự đóng; dropdown của "Hệ thống mã" hiện ra
  await expect(morePanel(page)).toBeHidden({ timeout: 30000 });
  const htmPanel = htmTopToggle
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
  await expect(htmPanel).toBeVisible({ timeout: 30000 });

  // Dropdown phải có ít nhất 1 link chức năng đang hiển thị
  // (probe thấy: "Mã đơn vị", "Mã phòng ban/bộ phận", "Mã người sử dụng"…)
  const visibleLinks = htmPanel.locator('a:visible');
  await expect(visibleLinks.first()).toBeVisible({ timeout: 30000 });
  expect(await visibleLinks.count()).toBeGreaterThanOrEqual(1);
  await expect(htmPanel.getByText('Mã đơn vị', { exact: true }).first()).toBeVisible({ timeout: 30000 });

  // Không xảy ra điều hướng — vẫn ở Dashboard
  expect(page.url()).toBe(urlBefore);
});

/* ================== 5. CLICK THÊM LẦN 2 ĐÓNG PANEL ================== */

test('[THÊM] Click THÊM lần thứ hai đóng panel lại', async ({ page }) => {
  test.setTimeout(120000);
  await waitMenuReady(page);
  await openMorePanel(page);
  await expect(morePanel(page).locator('button.pj-more-link').first()).toBeVisible({ timeout: 30000 });

  // Click lần 2 → panel đóng, aria quay lại "false"
  await moreToggle(page).click();
  await expect(morePanel(page)).toBeHidden({ timeout: 30000 });
  expect(await moreToggle(page).getAttribute('aria-expanded')).toBe('false');
});

/* ==== 6. SAU KHI DÙNG THÊM, HOVER MENU CHÍNH VẪN HOẠT ĐỘNG ==== */

test('[THÊM] Sau khi đã mở/đóng THÊM, hover menu CẤP ĐƠN vẫn mở dropdown', async ({ page }) => {
  test.setTimeout(120000);
  await waitMenuReady(page);

  // Mở rồi đóng panel THÊM
  await openMorePanel(page);
  await moreToggle(page).click();
  await expect(morePanel(page)).toBeHidden({ timeout: 30000 });

  // Hover menu chính "CẤP ĐƠN" — dropdown vẫn mở bình thường
  const capDonToggle = page
    .locator('.dropdown-toggle.name-menu--item')
    .filter({ hasText: /^\s*cấp đơn\s*$/i })
    .first();
  await capDonToggle.hover();
  const capDonPanel = capDonToggle
    .locator('xpath=ancestor::*[contains(@class,"pj-top-item")]')
    .locator('.pj-menu-panel')
    .first();
  await expect(capDonPanel).toBeVisible({ timeout: 30000 });
  await expect(capDonPanel.getByText('Cấp đơn xe ô tô', { exact: true })).toBeVisible({ timeout: 30000 });
});

/* ===== 7. ĐỐI CHỨNG: VIEWPORT 1600x900 MENU VỪA ĐỦ → KHÔNG THÊM ===== */

test.describe('Đối chứng viewport 1600x900', () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test('[THÊM] Viewport 1600x900: menu vừa đủ → nút THÊM không hiển thị', async ({ page }) => {
    test.setTimeout(120000);
    await waitMenuReady(page);

    // Menu cha hiển thị đầy đủ trên thanh menu
    const toggles = page.locator('.dropdown-toggle.name-menu--item');
    await expect(
      toggles.filter({ hasText: /^\s*cấp đơn\s*$/i }).first()
    ).toBeVisible({ timeout: 30000 });
    await expect(
      toggles.filter({ hasText: /^\s*hệ thống mã\s*$/i }).first()
    ).toBeVisible({ timeout: 30000 });

    // Nút THÊM tồn tại trong DOM nhưng bị ẩn vì không còn mục nào tràn
    await expect(moreToggle(page)).toBeHidden();
    await expect(morePanel(page)).toBeHidden();
  });
});