const { chromium } = require('@playwright/test');
const URLS = [
  '/InsuranceFee/SearchPaymentFts',
  '/InsuranceFee/SearchInvoiceFTS',
  '/InsuranceFee/Debts',
  '/CoInsurance/Debts',
  '/InsuranceCommission/DebtsAgen',
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/uat.json' });
  const page = await ctx.newPage();
  for (const u of URLS) {
    try {
      const resp = await page.goto('https://uat-capdon.pjico.com.vn' + u, { timeout: 60000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const info = await page.evaluate(() => ({
        title: document.title,
        headings: [...document.querySelectorAll('h1,h2,h3,h4,.page-title,[class*=title]')].map(h => (h.innerText||'').trim()).filter(Boolean).slice(0, 8),
        buttons: [...document.querySelectorAll('button, input[type=button], input[type=submit], a.btn')].map(b => ((b.innerText||b.value||'').trim()).replace(/\s+/g,' ')).filter(Boolean).slice(0, 15),
        tables: document.querySelectorAll('table').length,
        inputs: [...document.querySelectorAll('input:not([type=hidden]), select')].slice(0, 12).map(i => ({ t: i.type||i.tagName, n: i.name||'', id: i.id||'' })),
        bodyStart: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
      }));
      console.log('###URL:', u, 'HTTP:', resp && resp.status());
      console.log(JSON.stringify(info, null, 1));
    } catch (e) {
      console.log('###URL:', u, 'ERROR:', (e.message || '').slice(0, 200));
    }
  }
  await browser.close();
})();