// Trinh sát cấu trúc app UAT sau đăng nhập — dump menu, links, headings, forms ra text
const { chromium } = require('@playwright/test');

const LOGIN_URL = 'https://uat-capdon.pjico.com.vn/Home/Index';
// Nạp .env (nếu có) — không cần package ngoài
try { for (const _l of require('fs').readFileSync('.env', 'utf8').split(/\r?\n/)) { const _m = _l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/); if (_m && !process.env[_m[1]]) process.env[_m[1]] = _m[2].replace(/^["']|["']$/g, ''); } } catch {}
const EMAIL = process.env.UAT_EMAIL;
const PASS = process.env.UAT_PASS;
if (!EMAIL || !PASS) { console.error('Thieu UAT_EMAIL / UAT_PASS — tao file .env (xem .env.example)'); process.exit(1); }


(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const out = [];

  const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };

  try {
    await page.goto(LOGIN_URL, { timeout: 90000, waitUntil: 'domcontentloaded' });
    await page.locator('#EMAIL').fill(EMAIL);
    await page.locator('#email_click .show-password').click();
    await page.locator('input[type=password]').first().fill(PASS);
    await page.getByRole('link', { name: /ĐĂNG NHẬP/i })
      .or(page.getByRole('button', { name: /ĐĂNG NHẬP/i })).first().click();
    await page.waitForURL(u => !/login/i.test(u.href), { timeout: 90000 });

    log('=== URL SAU ĐĂNG NHẬP: ' + page.url());
    log('=== TITLE: ' + (await page.title()));

    // Đợi trang chính load
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // Dump tất cả link có text, id, hoặc aria-label
    log('\n=== TẤT CẢ LINK (href | text | id | class) ===');
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.getAttribute('href') || '',
        text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        id: a.id || '',
        cls: (a.className || '').toString().slice(0, 60),
        visible: !!(a.offsetParent || a.getBoundingClientRect().height > 0),
      })).filter(l => l.text || l.id || l.href.includes('/') && l.href.includes('capdon'))
    );
    for (const l of links) log(`[${l.visible ? 'x' : ' '}] ${JSON.stringify(l)}`);

    // Dump buttons
    log('\n=== BUTTONS ===');
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, input[type=button], input[type=submit], [role=button]')).map(b => ({
        text: ((b.innerText || b.value || b.getAttribute('aria-label') || '')).trim().replace(/\s+/g, ' ').slice(0, 60),
        id: b.id || '',
        cls: (b.className || '').toString().slice(0, 60),
      })).filter(b => b.text || b.id)
    );
    for (const b of buttons) log(JSON.stringify(b));

    // Dump các heading
    log('\n=== HEADINGS ===');
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h =>
        `${h.tagName}: ${(h.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100)}`)
    );
    for (const h of headings) log(h);

    // Dump các form và input
    log('\n=== FORMS & INPUTS ===');
    const forms = await page.evaluate(() =>
      Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action || '',
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
          tag: i.tagName, type: i.type || '', name: i.name || '', id: i.id || '',
          placeholder: i.placeholder || '', visible: !!(i.offsetParent || i.getBoundingClientRect().height > 0),
        })).slice(0, 30),
      }))
    );
    for (const f of forms) log(JSON.stringify(f));

    // Dump sidebar/menu đặc biệt (ul/li trong nav, sidebar)
    log('\n=== MENU TEXT (nav, sidebar, menu) ===');
    const menus = await page.evaluate(() => {
      const sels = ['nav', '.sidebar', '#sidebar', '.menu', '#menu', '.nav', '[class*=menu]', '[class*=sidebar]', '[class*=nav]'];
      const seen = new Set(); const res = [];
      for (const s of sels) {
        document.querySelectorAll(s).forEach(el => {
          if (seen.has(el)) return; seen.add(el);
          const t = (el.innerText || '').trim().replace(/\n+/g, ' | ').slice(0, 300);
          if (t) res.push(`${s} :: ${t}`);
        });
      }
      return res;
    });
    for (const m of menus) log(m);

    require('fs').writeFileSync('scout-result.txt', out.join('\n'), 'utf8');
    log('\n=== DONE — đã ghi scout-result.txt ===');
  } catch (e) {
    console.error('LỖI:', e.message);
    require('fs').writeFileSync('scout-result.txt', 'LỖI: ' + e.message + '\n\n' + out.join('\n'), 'utf8');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();