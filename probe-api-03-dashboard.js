const { chromium } = require('@playwright/test');

/**
 * PROBE API 03 (v2) — phân tích sâu:
 *  1) Parse kq_dtth trong DOM thật của page: số <tr>, tên các đơn vị từng dòng
 *  2) Đếm điểm theo TỪNG series của #bar-chart-dt (18 điểm / 3 series → tại sao?)
 *  3) Gọi trực tiếp POST /Dashboard/RegisterTSO với postData rỗng (URL đầy đủ)
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json', viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  let grBody = null, tsoBody = null;
  page.on('response', async r => {
    try {
      if (r.url().includes('/Dashboard/GeneratedRevenue') && !grBody && r.request().method() === 'POST') grBody = await r.text();
      if (r.url().includes('/Dashboard/RegisterTSO') && !tsoBody && r.request().method() === 'POST') tsoBody = await r.text();
    } catch (e) { }
  });

  await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { timeout: 90000, waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline && !(grBody && tsoBody)) await page.waitForTimeout(500);
  const chartDeadline = Date.now() + 30000;
  while (Date.now() < chartDeadline) {
    if (await page.locator('#bar-chart-dt .highcharts-point').count() > 0) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1000);

  console.log('=== 1) Parse kq_dtth (HTML table) bằng DOM của page ===');
  const kq = JSON.parse(grBody).data.kq_dtth;
  const tableInfo = await page.evaluate(html => {
    const d = document.createElement('div');
    d.innerHTML = '<table>' + html + '</table>';
    const rows = Array.from(d.querySelectorAll('tr'));
    return {
      rowCount: rows.length,
      rows: rows.map(tr => Array.from(tr.querySelectorAll('td')).map(td => (td.textContent || '').trim())),
    };
  }, kq);
  console.log('Số <tr> trong kq_dtth:', tableInfo.rowCount);
  tableInfo.rows.forEach((r, i) => console.log(`row[${i}]:`, JSON.stringify(r).slice(0, 250)));

  console.log('\n=== 2) Điểm theo từng series của #bar-chart-dt ===');
  const seriesInfo = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    return Array.from(dt.querySelectorAll('.highcharts-series')).map((s, i) => ({
      idx: i,
      class: (s.getAttribute('class') || ''),
      points: s.querySelectorAll('.highcharts-point').length,
      rect: s.querySelectorAll('rect').length,
      path: s.querySelectorAll('path').length,
    }));
  });
  console.log(JSON.stringify(seriesInfo, null, 1));
  const totalPoints = seriesInfo.reduce((a, s) => a + s.points, 0);
  console.log('Tổng điểm:', totalPoints);

  // Trục x thật (chỉ text nằm trong .highcharts-xaxis-labels)
  const xLabels = await page.evaluate(() => {
    const dt = document.querySelector('#bar-chart-dt');
    return Array.from(dt.querySelectorAll('.highcharts-xaxis-labels text')).map(t => (t.textContent || '').trim());
  });
  console.log('X labels (highcharts-xaxis-labels):', JSON.stringify(xLabels));

  console.log('\n=== 3) Gọi trực tiếp /Dashboard/RegisterTSO (postData rỗng, URL đầy đủ) ===');
  try {
    const resp = await ctx.request.post('https://uat-capdon.pjico.com.vn/Dashboard/RegisterTSO', { data: '' });
    const text = await resp.text();
    console.log('status:', resp.status(), '| content-type:', resp.headers()['content-type']);
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { }
    if (parsed) {
      console.log('code:', JSON.stringify(parsed.code), '| message:', JSON.stringify(parsed.message || '').slice(0, 200), '| systemMessage:', JSON.stringify(parsed.systemMessage || '').slice(0, 200));
      console.log('data:', JSON.stringify(parsed.data).slice(0, 200));
    } else {
      console.log('body (400 ký tự):', text.slice(0, 400));
    }
  } catch (e) {
    console.log('Lỗi gọi trực tiếp:', String(e).slice(0, 300));
  }

  await browser.close();
})();