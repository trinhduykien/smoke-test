import { test, expect } from '@playwright/test';

/**
 * API DATA TEST 03 — Dashboard: dữ liệu doanh thu (/Home/Index)
 * App UAT cấp đơn PJICO: https://uat-capdon.pjico.com.vn
 *
 * Test TẦNG API (fetch/xhr nội bộ của app) — không chỉ UI:
 *  - POST /Dashboard/RegisterTSO    : danh mục bộ lọc dashboard (b_dt_sl, b_dt_dvi 67 đơn vị, b_dt_lhnv, b_dt_ttrang)
 *  - POST /Dashboard/GeneratedRevenue: dữ liệu doanh thu — data.kq_dtth là CHUỖI HTML TABLE
 *    (thead 2 dòng header + dòng "Tổng cộng" + dòng từng đơn vị), kèm mảng cấu trúc
 *    b_dt_2 / kq_truc_x_2 / dt_ten_2 / dt_bh_2 / dt_tt_2 / dt_tl_2 cho chart.
 *
 * Kết quả probe thực tế (probe-api-03-dashboard.js, 2026-09-04):
 *  - Cả 2 endpoint: POST 200, body JSON envelope {"code":"000",...,"data":...}
 *  - Payload client-side mã hóa {"data":"<base64>"} — KHÔNG tự bịa, chỉ bắt response khi trang load
 *  - kq_dtth: 8 <tr> = 2 header + "Tổng cộng" + 5 đơn vị (TCT, AGI, BNI, BPH, HNO),
 *    số liệu dạng "463,461,843" / "292.5" / "120.4%" — parse được sau khi bỏ dấu phẩy và %
 *  - Chart #bar-chart-dt: trục x 5 nhãn đơn vị, 2 series cột × 5 điểm = 10 điểm .highcharts-point
 *  - Content-type của cả 2 endpoint là "text/html" dù body là JSON → FINDING (giống area 01)
 *  - Gọi trực tiếp /Dashboard/RegisterTSO với postData rỗng → code "400",
 *    message "Value cannot be null.Parameter name: input" (lộ exception .NET thô) → FINDING
 *
 * Toàn bộ test CHỈ-ĐỌC: mở trang, bắt response — không bấm nút nào thay đổi dữ liệu.
 */

test.use({ viewport: { width: 1600, height: 900 } });

// Bắt 2 response Dashboard khi /Home/Index load; trả về body text của từng endpoint
async function captureDashboardResponses(page: import('@playwright/test').Page) {
  const tsoPromise = page.waitForResponse(
    r => r.url().includes('/Dashboard/RegisterTSO') && r.request().method() === 'POST',
    { timeout: 60000 },
  );
  const grPromise = page.waitForResponse(
    r => r.url().includes('/Dashboard/GeneratedRevenue') && r.request().method() === 'POST',
    { timeout: 60000 },
  );
  await page.goto('/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const [tsoResp, grResp] = await Promise.all([tsoPromise, grPromise]);
  return {
    tsoResp,
    grResp,
    tsoJson: await tsoResp.json(),
    grJson: await grResp.json(),
  };
}

// Parse chuỗi HTML table (bắt đầu bằng <thead>) thành mảng dòng, mỗi dòng là mảng ô text
async function parseKqDtth(page: import('@playwright/test').Page, html: string) {
  return page.evaluate((raw: string) => {
    const d = document.createElement('div');
    d.innerHTML = '<table>' + raw + '</table>';
    return Array.from(d.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).map(td => (td.textContent || '').trim()),
    );
  }, html);
}

// Lấy tên mã đơn vị trong ngoặc, vd "Văn phòng Tổng Công ty (TCT)" -> "TCT"
function unitCode(name: string): string | null {
  const m = name.match(/\(([A-Za-z0-9]{2,5})\)\s*$/);
  return m ? m[1] : null;
}

test('03.1 — POST /Dashboard/RegisterTSO khi load: code 000, danh mục đơn vị doanh thu đầy đủ', async ({ page }) => {
  test.setTimeout(120000);

  const { tsoResp, tsoJson } = await captureDashboardResponses(page);

  // HTTP + envelope
  expect(tsoResp.status()).toBe(200);
  expect(tsoJson.code).toBe('000');
  console.log('RegisterTSO code:', tsoJson.code, '| message:', tsoJson.message);

  // data không rỗng — đủ 4 nhóm danh mục của tab doanh thu
  const data = tsoJson.data;
  expect(data, 'RegisterTSO phải trả data không rỗng').toBeTruthy();
  expect(Array.isArray(data.b_dt_sl) && data.b_dt_sl.length).toBeGreaterThan(0);
  expect(Array.isArray(data.b_dt_dvi) && data.b_dt_dvi.length).toBeGreaterThan(0);
  expect(Array.isArray(data.b_dt_lhnv) && data.b_dt_lhnv.length).toBeGreaterThan(0);
  expect(Array.isArray(data.b_dt_ttrang) && data.b_dt_ttrang.length).toBeGreaterThan(0);
  console.log('Số lượng: b_dt_sl =', data.b_dt_sl.length,
    '| b_dt_dvi =', data.b_dt_dvi.length,
    '| b_dt_lhnv =', data.b_dt_lhnv.length,
    '| b_dt_ttrang =', data.b_dt_ttrang.length);

  // Danh sách đơn vị (b_dt_dvi) có lựa chọn "Tất cả" và đơn vị đã biết TCT
  const dviCodes: string[] = data.b_dt_dvi.map((x: { MA: string }) => x.MA);
  expect(dviCodes).toContain('ALL');
  expect(dviCodes).toContain('TCT');
  const tct = data.b_dt_dvi.find((x: { MA: string }) => x.MA === 'TCT');
  expect(tct.TEN).toBe('Văn phòng Tổng Công ty (TCT)');

  // Kiểu hiển thị: có "Doanh thu theo tháng" và "Doanh thu theo năm"
  const slNames: string[] = data.b_dt_sl.map((x: { TEN: string }) => x.TEN);
  expect(slNames).toContain('Doanh thu theo tháng');
  expect(slNames).toContain('Doanh thu theo năm');
});

test('03.2 — POST /Dashboard/GeneratedRevenue khi load: code 000, kq_dtth là bảng HTML có dữ liệu doanh thu', async ({ page }) => {
  test.setTimeout(120000);

  const { grResp, grJson } = await captureDashboardResponses(page);

  // HTTP + envelope
  expect(grResp.status()).toBe(200);
  expect(grJson.code).toBe('000');
  console.log('GeneratedRevenue code:', grJson.code, '| message:', grJson.message);

  const data = grJson.data;
  expect(data, 'GeneratedRevenue phải trả data không rỗng').toBeTruthy();

  // kq_dtth là chuỗi bảng HTML doanh thu không rỗng
  const kqDtth: string = data.kq_dtth;
  expect(typeof kqDtth).toBe('string');
  expect(kqDtth.length).toBeGreaterThan(0);

  // Có cấu trúc bảng HTML + tiêu đề các cột doanh thu
  expect(kqDtth).toMatch(/<t[dhr]\b/i);
  expect(kqDtth).toContain('Đơn vị');
  expect(kqDtth).toContain('Doanh thu lũy kế từ đầu năm');
  expect(kqDtth).toContain('Doanh thu lũy kế từ đầu tháng');
  // Kỳ hiện tại theo dữ liệu thật (T09/2026)
  expect(kqDtth).toMatch(/T\d{2}\/\d{4}/);

  // Có dòng tổng cộng + tên đơn vị đã biết (TCT)
  expect(kqDtth).toContain('Tổng cộng');
  expect(kqDtth).toContain('TCT');
  expect(kqDtth).toContain('Văn phòng Tổng Công ty (TCT)');

  // Kèm mảng dữ liệu cấu trúc cho chart
  expect(Array.isArray(data.kq_truc_x_2) && data.kq_truc_x_2.length).toBeGreaterThan(0);
  expect(Array.isArray(data.b_dt_2) && data.b_dt_2.length).toBeGreaterThan(0);
  console.log('Số đơn vị trong mảng chart (b_dt_2):', data.b_dt_2.length,
    '| trục x:', JSON.stringify(data.kq_truc_x_2));

  await page.screenshot({ path: 'test-results/api-03-generated-revenue.png', fullPage: false });
});

test('03.3 — kq_dtth: dòng từng đơn vị có số liệu parse được thành số, khớp mảng b_dt_2', async ({ page }) => {
  test.setTimeout(120000);

  const { grJson } = await captureDashboardResponses(page);
  const data = grJson.data;
  expect(grJson.code).toBe('000');

  const rows = await parseKqDtth(page, data.kq_dtth);
  console.log('Số <tr> trong kq_dtth:', rows.length);
  expect(rows.length).toBeGreaterThanOrEqual(4); // tối thiểu 2 header + Tổng cộng + 1 đơn vị

  // 2 dòng đầu là header, dòng tiếp theo phải là "Tổng cộng"
  expect(rows[0][0]).toBe('Đơn vị');
  expect(rows[2][0]).toBe('Tổng cộng');

  // Dòng tổng cộng: các ô số liệu phải parse được thành số ("463,461,843" -> 463461843)
  const totalRow = rows[2];
  expect(totalRow.length).toBeGreaterThan(1);
  for (let i = 1; i < totalRow.length; i++) {
    const cell = totalRow[i];
    const num = Number(cell.replace(/,/g, '').replace(/%/g, '').trim());
    expect(Number.isFinite(num), `Ô Tổng cộng [${i}] "${cell}" phải là số parse được`).toBeTruthy();
  }

  // Các dòng đơn vị: có mã trong ngoặc, số liệu parse được
  const unitRows = rows.filter(r => r[0] !== 'Đơn vị' && r[0] !== 'Tổng cộng'
    && !r[0].startsWith('Năm ') && unitCode(r[0]) !== null);
  expect(unitRows.length).toBeGreaterThan(0);
  console.log('Dòng đơn vị trong kq_dtth:', unitRows.map(r => r[0]).join(' | '));

  const unitCodes = unitRows.map(r => unitCode(r[0]) as string);
  expect(unitCodes).toContain('TCT');

  for (const row of unitRows) {
    expect(row.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < row.length; i++) {
      const cell = row[i];
      const num = Number(cell.replace(/,/g, '').replace(/%/g, '').trim());
      expect(Number.isFinite(num), `${row[0]} ô [${i}] "${cell}" phải là số parse được`).toBeTruthy();
    }
  }

  // Số đơn vị trong bảng HTML khớp mảng cấu trúc b_dt_2 của cùng response
  expect(unitRows.length).toBe(data.b_dt_2.length);
  // Mã đơn vị khớp thứ tự kq_truc_x_2
  expect(unitCodes).toEqual(data.kq_truc_x_2);
});

test('03.4 — API ↔ chart: số đơn vị trong kq_dtth khớp trục x và số điểm series cột của #bar-chart-dt', async ({ page }) => {
  test.setTimeout(120000);

  const { grJson } = await captureDashboardResponses(page);
  const data = grJson.data;
  expect(grJson.code).toBe('000');

  // Đợi Highcharts vẽ điểm thật
  await expect(page.locator('#bar-chart-dt .highcharts-point').first())
    .toBeVisible({ timeout: 30000 });

  const chart = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    if (!dt) return null;
    return {
      xLabels: Array.from(dt.querySelectorAll('.highcharts-xaxis-labels text'))
        .map(t => (t.textContent || '').trim()),
      series: Array.from(dt.querySelectorAll('.highcharts-series')).map(s => ({
        cls: s.getAttribute('class') || '',
        points: s.querySelectorAll('.highcharts-point').length,
      })),
    };
  });
  expect(chart, '#bar-chart-dt phải tồn tại và được Highcharts vẽ').toBeTruthy();
  console.log('Chart trục x:', JSON.stringify(chart.xLabels), '| series:', JSON.stringify(chart.series));

  const rows = await parseKqDtth(page, data.kq_dtth);
  const unitRows = rows.filter(r => r[0] !== 'Đơn vị' && r[0] !== 'Tổng cộng'
    && !r[0].startsWith('Năm ') && unitCode(r[0]) !== null);
  const unitCodes = unitRows.map(r => unitCode(r[0]) as string);
  expect(unitRows.length).toBeGreaterThan(0);
  console.log('Đơn vị trong kq_dtth:', unitCodes.join(', '));

  // Trục x của chart = đúng danh sách đơn vị trong bảng API (cùng số lượng, cùng thứ tự)
  expect(chart.xLabels.length).toBe(unitRows.length);
  expect(chart.xLabels).toEqual(unitCodes);

  // Mỗi series cột có đúng 1 điểm dữ liệu cho mỗi đơn vị
  const columnSeries = chart.series.filter(s => s.cls.includes('highcharts-column-series'));
  expect(columnSeries.length).toBeGreaterThanOrEqual(2);
  for (const s of columnSeries) {
    expect(s.points, `Series cột phải có ${unitRows.length} điểm (mỗi đơn vị 1 điểm)`).toBe(unitRows.length);
  }
  const totalPoints = chart.series.reduce((a, s) => a + s.points, 0);
  console.log('Tổng điểm .highcharts-point của chart:', totalPoints);
  expect(totalPoints).toBe(columnSeries.length * unitRows.length);
});

test('03.5 — Content-type audit: API Dashboard trả JSON phải gắn nhãn application/json (hiện sai text/html)', async ({ request, page }) => {
  test.setTimeout(120000);

  const { tsoResp, grResp } = await captureDashboardResponses(page);

  // Body là JSON hợp lệ (parse được) → Content-type phải là application/json
  // Lỗi đã quan sát: cả 2 endpoint đều trả "text/html; charset=utf-8" — finding chung giống area 01
  const tsoCt = tsoResp.headers()['content-type'] || '';
  const grCt = grResp.headers()['content-type'] || '';
  console.log('Content-type RegisterTSO:', tsoCt, '| GeneratedRevenue:', grCt);
  console.log('Body RegisterTSO bắt đầu bằng:', JSON.stringify((await tsoResp.text()).slice(0, 40)));

  // Chứng minh body là JSON hợp lệ trước khi đòi nhãn application/json
  const tsoJson = await tsoResp.json();
  const grJson = await grResp.json();
  expect(tsoJson.code).toBe('000');
  expect(grJson.code).toBe('000');

  expect(tsoCt, 'RegisterTSO trả JSON nhưng Content-type phải là application/json').toContain('application/json');
  expect(grCt, 'GeneratedRevenue trả JSON nhưng Content-type phải là application/json').toContain('application/json');
});

test('03.6 — POST /Dashboard/RegisterTSO payload rỗng: lỗi phải là message nghiệp vụ, không lộ exception .NET thô', async ({ request }) => {
  test.setTimeout(120000);

  // Endpoint chỉ-đọc (đăng ký danh mục); gọi với body rỗng để kiểm tra xử lý đầu vào
  const resp = await request.post('/Dashboard/RegisterTSO', { data: '' });
  expect(resp.status()).toBe(200);
  const json = await resp.json();
  console.log('code:', json.code, '| message:', JSON.stringify(json.message),
    '| systemMessage:', JSON.stringify(json.systemMessage));

  // Payload rỗng không hợp lệ → được phép trả lỗi business code "400" + message nghiệp vụ,
  // NHƯNG không được lộ exception framework bên trong
  expect(json.code).toBe('400');
  const msg = `${json.message || ''} ${json.systemMessage || ''}`;
  expect(msg, 'Message lỗi không được chứa exception .NET thô (Value cannot be null / Parameter name / Stack Trace)')
    .not.toMatch(/value cannot be null|parameter name|at (System|App_Code)\.|ArgumentNullException/i);
});