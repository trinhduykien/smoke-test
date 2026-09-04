import { test, expect, ConsoleMessage, Page } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU 03 — Console error / pageerror
 *
 * Mục tiêu: dò lỗi JavaScript thật (uncaught exception, console.error) trên 5 trang chính:
 *   /Home/Index, /ContractCar/Search, /InsuranceFee/SearchPaymentFts,
 *   /Report/HealthReport, /ClaimGeneral/Search
 *
 * Cách làm: với mỗi trang, gắn listener pageerror + console(error) TRƯỚC khi goto,
 * đợi trang render xong + thêm 3 giây cho các script async chạy, rồi assert
 * không có lỗi nào. Chỉ filter noise (favicon, ảnh 404) — KHÔNG filter lỗi thật
 * của app. Nếu test fail nghĩa là app có JS crash thật → ghi nhận finding.
 */

test.use({ viewport: { width: 1600, height: 900 } });

/** Các trang chính cần kiểm tra console error */
const PAGES: { path: string; title: string }[] = [
  { path: '/Home/Index', title: 'Trang chủ' },
  { path: '/ContractCar/Search', title: 'Tra cứu hợp đồng xe' },
  { path: '/InsuranceFee/SearchPaymentFts', title: 'Tra cứu phí bảo hiểm (FTS)' },
  { path: '/Report/HealthReport', title: 'Báo cáo sức khoẻ' },
  { path: '/ClaimGeneral/Search', title: 'Tra cứu bồi thường' },
];

/** Bộ lọc noise: chỉ favicon + ảnh 404 — KHÔNG filter lỗi thật của app */
const NOISE_FAVICON = /favicon/i;
const NOISE_IMG_404 = /\.(png|ico|jpe?g|gif|svg)(\?|$)/i;

function isNoise(msg: ConsoleMessage): boolean {
  const text = msg.text();
  const loc = msg.location()?.url || '';
  if (NOISE_FAVICON.test(text) || NOISE_FAVICON.test(loc)) return true;
  // console "Failed to load resource ... 404" cho file ảnh → noise
  if (/404/i.test(text) && NOISE_IMG_404.test(loc)) return true;
  // text có dạng "404 ... .png/.ico" (kiểu cũ) → noise
  if (/404[^]*\.(png|ico)/i.test(text)) return true;
  return false;
}

/** Gắn listener thu thập pageerror + console error (đã lọc noise) vào trang */
function collectJsErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !isNoise(m)) errors.push(`[console.error] ${m.text()}`);
  });
  return errors;
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({ path: `test-results/depth03-${testInfo.line}.png` }).catch(() => {});
  }
});

for (const { path, title } of PAGES) {
  test(`Console error / pageerror: ${path} (${title}) không phát sinh lỗi JS`, async ({ page }) => {
    test.setTimeout(120000);

    // Gắn listener TRƯỚC khi điều hướng để không bỏ sót lỗi sớm
    const errors = collectJsErrors(page);

    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('load');

    // Guard: nếu session hết hạn bị đá về trang login thì report rõ ràng
    expect(await page.locator('#EMAIL').count(), 'Session còn hợp lệ, không bị đá về trang login').toBe(0);

    // Đợi 3s cho các script async / AJAX init chạy hết
    await page.waitForTimeout(3000);

    // Kỳ vọng ĐÚNG: trang không được có bất kỳ JS crash / console.error thật nào
    expect(
      errors,
      `${title} (${path}) không được phát sinh pageerror/console.error.\nLỗi bắt được:\n${errors.join('\n')}`
    ).toEqual([]);
  });
}