import { test, expect } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU — 11: Giám sát response 5xx/4xx ngầm khi load trang
 * App UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn
 *
 * Mục đích: bắt các AJAX endpoint hỏng mà HTTP 200 của document + element visible
 * vẫn che được. Với mỗi trang đang pass của vòng smoke:
 *   1) Gắn listener page.on('response') TRƯỚC khi goto (không bỏ sót request nào)
 *   2) goto + đợi networkidle (tối đa 5s cho các request khởi động sau render)
 *   3) expect(failed).toEqual([]) — mọi response có status >= 500 đều là finding thật
 *
 * Các trang được test: /ContractCar/Search, /ClaimGeneral/Search,
 * /InsuranceFee/SearchPaymentFts, /Report/HealthReport, /Home/Index
 *
 * Chỉ-đọc: chỉ goto trang, không tương tác gì thêm. Toàn bộ hành vi an toàn.
 */

const PAGES = [
  '/ContractCar/Search',
  '/ClaimGeneral/Search',
  '/InsuranceFee/SearchPaymentFts',
  '/Report/HealthReport',
  '/Home/Index',
];

// Helper: load một trang và trả về danh sách response có status >= 500
async function collectServerErrors(page: import('@playwright/test').Page, path: string): Promise<string[]> {
  const failed: string[] = [];
  // Gắn listener TRƯỚC goto để không bỏ sót request nào
  page.on('response', r => {
    if (r.status() >= 500) {
      failed.push(r.status() + ' ' + r.url());
    }
  });

  await page.goto(path, { timeout: 90000, waitUntil: 'domcontentloaded' });
  // Đợi networkidle (tối đa 5s) để các AJAX khởi động sau render kịp trả lời
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // Không đạt networkidle trong 5s — các request đã bắt vẫn được kiểm tra
  }
  return failed;
}

for (const path of PAGES) {
  test(`không có response 5xx ngầm khi load ${path}`, async ({ page }) => {
    test.setTimeout(120000);

    const failed = await collectServerErrors(page, path);

    // In ra để dễ chẩn đoán khi fail
    if (failed.length > 0) {
      console.log(`Endpoint 5xx trên ${path}:`);
      for (const f of failed) console.log('  ' + f);
    }

    expect(failed).toEqual([]);
  });
}