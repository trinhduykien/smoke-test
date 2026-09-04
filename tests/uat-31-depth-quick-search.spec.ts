import { test, expect, type Page } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU — "TÌM NHANH CHỨC NĂNG — KẾT QUẢ"
 * App UAT cấp đơn bảo hiểm PJICO: https://uat-capdon.pjico.com.vn
 * Session đăng nhập lưu sẵn tại .auth/uat.json (tạo bằng: node scripts/save-auth.js)
 *
 * Phạm vi (tương tác thật, CHỈ ĐỌC — KHÔNG bấm nút Lưu/Thêm/Xóa/Đăng xuất):
 *   1. Bấm #pjMenuSearchToggle → panel #pjMenuSearchPanel + ô #pjMenuSearchInput hiện,
 *      gợi ý ban đầu "Nhập tên chức năng, nghiệp vụ hoặc báo cáo cần mở." (#pjMenuSearchEmpty).
 *   2. fill('cấp đơn') → dropdown kết quả #pjMenuSearchResults hiện item "Cấp đơn xe ô tô"
 *      (mỗi kết quả là thẻ <a class="pj-menu-search-result" href="/ContractCar/Search">,
 *      kết quả đầu có class is-selected) — quan sát bằng probe-depth-02-quick-search.js.
 *   3. Click kết quả "Cấp đơn xe ô tô" → điều hướng /ContractCar/Search, title trang "Xe cơ giới: Tìm kiếm hợp đồng / giấy chứng nhận".
 *   4. Từ khóa không khớp → không có kết quả nào (a.pj-menu-search-result = 0).
 *   5. Bấm Enter khi đã chọn kết quả đầu → cũng điều hướng tới /ContractCar/Search.
 *
 * Hành vi đã biết (từ vòng smoke): sau domcontentloaded app JS có thể chưa bind handler
 * cho #pjMenuSearchToggle → dùng waitForLoadState('load') và nếu click lần 1 không mở
 * panel thì click lại lần 2 (KHÔNG force click).
 */

// Menu top cần độ rộng đủ để ô tìm nhanh không bị tràn — probe dùng 1600px
test.use({ viewport: { width: 1600, height: 900 } });

const HOME = '/Home/Index';

async function assertNotServerError(page: Page) {
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText, 'Trang không được hiển thị nội dung lỗi server').not.toMatch(/Server Error|Runtime Error|Exception/i);
}

// Vào dashboard, đợi app JS bind xong handler của ô tìm nhanh
async function gotoHomeAndLoad(page: Page) {
  const resp = await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  expect(resp && resp.status()).toBe(200);
  await page.waitForLoadState('load');
  await expect(page.locator('#pjMenuSearchToggle')).toBeVisible({ timeout: 30000 });
}

/**
 * Bấm #pjMenuSearchToggle mở panel tìm nhanh.
 * Click lần 1 có thể bị nuốt (JS chưa bind) → kiểm tra và click lại lần 2 nếu cần.
 * KHÔNG force click — force có thể bấm khi handler đã hoạt động nhưng đang đóng panel.
 */
async function openQuickSearch(page: Page) {
  const input = page.locator('#pjMenuSearchInput');
  if (!(await input.isVisible().catch(() => false))) {
    await page.locator('#pjMenuSearchToggle').click({ timeout: 30000 });
    try {
      await expect(input).toBeVisible({ timeout: 5000 });
    } catch {
      // Click lần 1 bị nuốt → click lại lần 2
      await page.locator('#pjMenuSearchToggle').click({ timeout: 30000 });
      await expect(input).toBeVisible({ timeout: 10000 });
    }
  }
  await expect(input).toBeEditable({ timeout: 10000 });
  return input;
}

/* ========== 1. MỞ PANEL TÌM NHANH BẰNG #pjMenuSearchToggle ========== */

test('[TÌM NHANH] Bấm #pjMenuSearchToggle mở panel + ô nhập tìm kiếm', async ({ page }) => {
  test.setTimeout(120000);
  await gotoHomeAndLoad(page);

  const input = await openQuickSearch(page);

  // Panel tìm nhanh hiện ra, chứa ô nhập + gợi ý ban đầu
  await expect(page.locator('#pjMenuSearchPanel')).toBeVisible({ timeout: 30000 });
  await expect(input).toBeVisible();
  await expect(page.locator('#pjMenuSearchPanel')).toContainText(/Nhập tên chức năng|nghiệp vụ|báo cáo/i, { timeout: 30000 });

  // Chưa gõ gì → chưa có kết quả nào (khối kết quả trống, gợi ý vẫn hiện)
  await expect(page.locator('#pjMenuSearchPanel a.pj-menu-search-result')).toHaveCount(0, { timeout: 10000 });
  await assertNotServerError(page);
});

/* ========== 2. GÕ TỪ KHÓA → DROPDOWN KẾT QUẢ ========== */

test('[TÌM NHANH] Gõ "cấp đơn" hiện dropdown kết quả chứa "Cấp đơn xe ô tô"', async ({ page }) => {
  test.setTimeout(120000);
  await gotoHomeAndLoad(page);

  const input = await openQuickSearch(page);
  await input.fill('cấp đơn');

  // Dropdown kết quả hiện item "Cấp đơn xe ô tô" — đợi JS lọc xong
  const results = page.locator('#pjMenuSearchResults');
  await expect(results).toBeVisible({ timeout: 30000 });
  await expect(
    page.locator('#pjMenuSearchPanel').getByText('Cấp đơn xe ô tô', { exact: true })
  ).toBeVisible({ timeout: 30000 });

  // Kết quả "Cấp đơn xe ô tô" là link trỏ về /ContractCar/Search và là kết quả được chọn (is-selected)
  const firstResult = page.locator('#pjMenuSearchPanel a.pj-menu-search-result').first();
  await expect(firstResult).toHaveAttribute('href', /\/ContractCar\/Search\/?$/i, { timeout: 30000 });
  await expect(firstResult).toContainText('Cấp đơn xe ô tô');

  // "Cấp đơn" khớp nhiều chức năng → có nhiều hơn 1 kết quả (cấp đơn ô tô, xe máy, nhà ở…)
  const count = await page.locator('#pjMenuSearchPanel a.pj-menu-search-result').count();
  expect(count, 'Từ khóa "cấp đơn" phải trả về nhiều kết quả').toBeGreaterThan(1);
  await assertNotServerError(page);
});

/* ========== 3. CLICK KẾT QUẢ → ĐIỀU HƯỚNG TRANG CẤP ĐƠN XE Ô TÔ ========== */

test('[TÌM NHANH] Click kết quả "Cấp đơn xe ô tô" điều hướng tới /ContractCar/Search', async ({ page }) => {
  test.setTimeout(120000);
  await gotoHomeAndLoad(page);

  const input = await openQuickSearch(page);
  await input.fill('cấp đơn');

  // Đợi item kết quả hiện rồi mới click — click lần 1 có thể bị nuốt → retry
  const resultItem = page.locator('#pjMenuSearchPanel').getByText('Cấp đơn xe ô tô', { exact: true }).first();
  await expect(resultItem).toBeVisible({ timeout: 30000 });

  let navigated = false;
  for (let attempt = 1; attempt <= 3 && !navigated; attempt++) {
    await resultItem.click({ timeout: 30000 }).catch(() => {});
    try {
      await page.waitForURL(/\/ContractCar\/Search\/?/i, { timeout: 15000 });
      navigated = true;
    } catch {
      // chưa điều hướng → panel có thể đã đóng, mở lại rồi click tiếp
      if (!/\/ContractCar\/Search\/?/i.test(page.url())) {
        const input2 = await openQuickSearch(page).catch(() => null);
        if (input2) await input2.fill('cấp đơn').catch(() => {});
        await expect(resultItem).toBeVisible({ timeout: 15000 }).catch(() => {});
      }
    }
  }
  expect(navigated, 'Click kết quả tìm nhanh phải điều hướng tới trang Cấp đơn xe ô tô').toBe(true);

  // Trang đích tải OK — title trang tìm kiếm hợp đồng xe cơ giới
  await page.waitForLoadState('domcontentloaded', { timeout: 90000 });
  await expect(page).toHaveURL(/\/ContractCar\/Search\/?/i, { timeout: 30000 });
  await expect(page).toHaveTitle(/Xe cơ giới.*Tìm kiếm/i, { timeout: 30000 });
  await assertNotServerError(page);
});

/* ========== 4. TỪ KHÓA KHÔNG KHỚP → KHÔNG CÓ KẾT QUẢ ========== */

test('[TÌM NHANH] Từ khóa không khớp không trả về kết quả nào', async ({ page }) => {
  test.setTimeout(120000);
  await gotoHomeAndLoad(page);

  const input = await openQuickSearch(page);
  await input.fill('zzzz-khong-ton-tai-9999');

  // Đợi JS lọc xong → không có kết quả nào trong dropdown
  await page.waitForTimeout(800);
  await expect(page.locator('#pjMenuSearchPanel a.pj-menu-search-result')).toHaveCount(0, { timeout: 10000 });

  // Panel không hiện "Cấp đơn xe ô tô" với từ khóa vô nghĩa
  await expect(page.locator('#pjMenuSearchPanel').getByText('Cấp đơn xe ô tô', { exact: true })).toHaveCount(0);
  await assertNotServerError(page);
});

/* ========== 5. ENTER VỚI KẾT QUẢ ĐANG CHỌN → ĐIỀU HƯỚNG ========== */

test('[TÌM NHANH] Bấm Enter với kết quả đầu đang chọn điều hướng tới /ContractCar/Search', async ({ page }) => {
  test.setTimeout(120000);
  await gotoHomeAndLoad(page);

  const input = await openQuickSearch(page);
  await input.fill('cấp đơn');

  // Kết quả đầu "Cấp đơn xe ô tô" đang được chọn (is-selected) → Enter mở nó
  const firstResult = page.locator('#pjMenuSearchPanel a.pj-menu-search-result').first();
  await expect(firstResult).toBeVisible({ timeout: 30000 });
  await expect(firstResult).toContainText('Cấp đơn xe ô tô');

  await input.press('Enter');
  await page.waitForURL(/\/ContractCar\/Search\/?/i, { timeout: 60000 });

  await page.waitForLoadState('domcontentloaded', { timeout: 90000 });
  await expect(page).toHaveTitle(/Xe cơ giới.*Tìm kiếm/i, { timeout: 30000 });
  await assertNotServerError(page);
});