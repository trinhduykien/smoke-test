import { test, expect } from '@playwright/test';

/**
 * VÒNG TEST CHIỀU SÂU — Khu vực 04: Dashboard chart render thật (/Home/Index)
 * App UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn
 *
 * Mục đích: xác nhận biểu đồ doanh thu (#bar-chart-dt) được Highcharts VẼ THẬT
 * (SVG thật, có series/point/legend/label), dữ liệu AJAX trả về và tooltip
 * hiển thị dữ liệu thật khi hover — không chỉ assert container rỗng.
 *
 * Kết quả probe thực tế (probe-depth-04-dashboard-chart*.js):
 *  - #bar-chart-dt nằm trong #tab3, được Highcharts render SVG width 1510 (viewport 1600x900),
 *    3 series, 18 điểm, legend: "Doanh thu tháng trước", "Doanh thu tháng hiện tại", "Tỷ lệ tăng trưởng (%)"
 *  - AJAX POST /Dashboard/GeneratedRevenue trả về code "000" + dữ liệu doanh thu
 *  - Hover cột đầu → .highcharts-tooltip thứ 2 chứa text: "Văn phòng Tổng Công ty (TCT)● Doanh thu tháng trước: ...● Doanh thu tháng hiện tại: ..."
 *  - Chart responsive: resize viewport → svg width đổi theo
 *
 * Toàn bộ test CHỈ-ĐỌC: điều hướng, hover — không bấm nút nào gây thay đổi dữ liệu.
 */

// Chart cần không gian hiển thị đầy đủ — dùng viewport rộng như probe
test.use({ viewport: { width: 1600, height: 900 } });

test('04.1 — Dashboard chart: Highcharts vẽ SVG thật trong #bar-chart-dt (không chỉ container)', async ({ page }) => {
  test.setTimeout(120000);

  // Chart vẽ sau AJAX POST /Dashboard/GeneratedRevenue — bắt response để chắc chắn dữ liệu đã về
  const responsePromise = page.waitForResponse(
    r => r.url().includes('/Dashboard/GeneratedRevenue') && r.request().method() === 'POST',
    { timeout: 60000 },
  );
  await page.goto('/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const resp = await responsePromise;
  expect(resp.status()).toBe(200);

  const body = await resp.text();
  // API trả JSON code "000" (thành công) kèm dữ liệu doanh thu dạng HTML table
  expect(body).toContain('"code":"000"');

  // Highcharts đã VẼ THẬT: có .highcharts-container hoặc svg bên trong #bar-chart-dt
  await expect(
    page.locator('#bar-chart-dt .highcharts-container, #bar-chart-dt svg').first(),
  ).toBeVisible({ timeout: 30000 });

  // Có series thật (bar chart 2 series cột + 1 series đường)
  await expect(page.locator('#bar-chart-dt .highcharts-series')).not.toHaveCount(0, { timeout: 30000 });
  const seriesCount = await page.locator('#bar-chart-dt .highcharts-series').count();
  expect(seriesCount).toBeGreaterThan(0);
  console.log('Số series đã vẽ:', seriesCount);

  // Có điểm dữ liệu thật (rect/path của các cột)
  await expect(page.locator('#bar-chart-dt .highcharts-point').first()).toBeVisible({ timeout: 30000 });
  const pointCount = await page.locator('#bar-chart-dt .highcharts-point').count();
  expect(pointCount).toBeGreaterThan(0);
  console.log('Số điểm dữ liệu đã vẽ:', pointCount);

  await page.screenshot({ path: 'test-results/depth-04-chart-rendered.png', fullPage: false });
});

test('04.2 — Chart có nội dung thật: legend series, tên trục, nhãn đơn vị (text trong SVG)', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bar-chart-dt svg').first()).toBeVisible({ timeout: 30000 });

  // Đợi SVG có đủ text nội dung (chart AJAX có thể vẽ lại sau khi nhận dữ liệu)
  await expect
    .poll(async () => {
      const texts = await page.locator('#bar-chart-dt svg text').allTextContents();
      return texts.join(' | ');
    }, { timeout: 30000, intervals: [1000, 2000, 3000] })
    .toContain('Doanh thu tháng hiện tại');

  const svgText = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    return dt ? Array.from(dt.querySelectorAll('svg text')).map(t => (t.textContent || '').trim()).join(' | ') : '';
  });
  console.log('Toàn bộ text trong SVG chart:', svgText.slice(0, 500));

  // Legend 3 series của biểu đồ doanh thu
  expect(svgText).toContain('Doanh thu tháng trước');
  expect(svgText).toContain('Doanh thu tháng hiện tại');
  expect(svgText).toContain('Tỷ lệ tăng trưởng (%)');
  // Tên trục
  expect(svgText).toContain('Giá trị*(tỷ)');
  expect(svgText).toContain('Tỉ lệ*(%)');

  // Legend hiển thị thật trong SVG (không chỉ trong modal ẩn)
  const legendVisible = await page.locator('#bar-chart-dt .highcharts-legend').first().isVisible();
  expect(legendVisible).toBeTruthy();
});

test('04.3 — Hover cột chart: tooltip Highcharts hiện dữ liệu doanh thu thật', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bar-chart-dt .highcharts-series').first()).toBeVisible({ timeout: 30000 });

  // Cột bar đầu tiên của series đầu tiên
  const bar = page.locator('#bar-chart-dt .highcharts-series rect, #bar-chart-dt .highcharts-series path').first();
  await expect(bar).toBeVisible({ timeout: 15000 });
  await bar.hover();

  // Tooltip Highcharts được tạo sau hover — chứa tên đơn vị + giá trị series thật
  // (dùng textContent vì tooltip là SVG, innerText rỗng)
  await expect
    .poll(async () => {
      const tooltips = page.locator('.highcharts-tooltip');
      const n = await tooltips.count();
      for (let i = 0; i < n; i++) {
        const text = (await tooltips.nth(i).textContent()) || '';
        if (text.includes('Doanh thu')) return text;
      }
      return '';
    }, { timeout: 30000, intervals: [500, 1000, 2000] })
    .toContain('Doanh thu tháng hiện tại');

  const tooltipText = await page.evaluate(() => {
    const tips = Array.from(document.querySelectorAll('.highcharts-tooltip'));
    return tips.map(t => (t.textContent || '').trim()).filter(t => t.includes('Doanh thu')).join(' || ');
  });
  console.log('Tooltip sau hover:', tooltipText.slice(0, 300));
  // Tooltip phải kèm giá trị dạng số của series "Doanh thu tháng hiện tại"
  expect(tooltipText).toMatch(/Doanh thu tháng hiện tại:\s*[\d.,]+/);
});

test('04.4 — Chart responsive: resize viewport → SVG chart vẽ lại theo chiều rộng mới', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bar-chart-dt svg').first()).toBeVisible({ timeout: 30000 });

  const widthBefore = Number(
    await page.locator('#bar-chart-dt svg').first().getAttribute('width'),
  );
  console.log('Chiều rộng SVG ban đầu (viewport 1600):', widthBefore);
  expect(widthBefore).toBeGreaterThan(500);

  // Thu nhỏ viewport → Highcharts redraw
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect
    .poll(async () => Number(await page.locator('#bar-chart-dt svg').first().getAttribute('width')), {
      timeout: 30000,
      intervals: [500, 1000],
    })
    .toBeLessThan(widthBefore);

  const widthAfter = Number(await page.locator('#bar-chart-dt svg').first().getAttribute('width'));
  console.log('Chiều rộng SVG sau resize (viewport 1200):', widthAfter);

  // Chart vẫn hiển thị và có series sau khi vẽ lại
  await expect(page.locator('#bar-chart-dt svg').first()).toBeVisible();
  expect(await page.locator('#bar-chart-dt .highcharts-series').count()).toBeGreaterThan(0);
});