const { chromium } = require('@playwright/test');

/**
 * PROBE — Link external & LogOut (chỉ đọc, KHÔNG click link đăng xuất/đổi mật khẩu)
 * Khám phá trên /Home/Index:
 *  1) Link chính sách bảo mật a[href*='Chinh-sach-bao-mat-thong-tin-ca-nhan'] — href/target/rel/text/vị trí
 *  2) Footer mailto: a[href='mailto:customercare.ipjico@petrolimex.com.vn'] — tồn tại, text, các mailto khác
 *  3) User menu (#pjUserMenuToggle) → .profile-menu: các link href (LogOut, Đổi mật khẩu, Tạo QR cấp đơn)
 *  4) Mọi external link (href http khác domain) trên trang
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: '.auth/uat.json',
    viewport: { width: 1600, height: 900 },
  });
  const page = await ctx.newPage();

  const resp = await page.goto('https://uat-capdon.pjico.com.vn/Home/Index', { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('== goto /Home/Index status:', resp && resp.status(), 'url:', page.url());
  await page.waitForLoadState('load');

  // ---- 1) Link chính sách bảo mật ----
  const policyLinks = await page.locator("a[href*='Chinh-sach-bao-mat-thong-tin-ca-nhan']").all();
  console.log('\n== policy link count:', policyLinks.length);
  for (const l of policyLinks) {
    const attr = await l.evaluate((el) => {
      const a = el;
      return {
        href: a.getAttribute('href'),
        resolved: a.href,
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
        text: a.textContent.trim(),
        html: a.outerHTML.slice(0, 300),
      };
    });
    console.log(JSON.stringify(attr, null, 2));
    // breadcrumb DOM của link (để biết nó nằm ở footer/hộp thoại...)
    const path = await l.evaluate((el) => {
      const parts = [];
      let n = el;
      while (n && n !== document.body) {
        parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
        n = n.parentElement;
      }
      return parts.join(' > ');
    });
    console.log('path:', path);
  }

  // ---- 2) mailto footer ----
  const mailtos = await page.locator("a[href^='mailto:']").all();
  console.log('\n== mailto count:', mailtos.length);
  for (const m of mailtos) {
    const info = await m.evaluate((el) => ({
      href: el.getAttribute('href'),
      text: el.textContent.trim(),
      visible: !!(el.offsetWidth || el.offsetHeight),
    }));
    console.log(JSON.stringify(info));
  }

  // ---- footer nói chung ----
  const footerHtml = await page.evaluate(() => {
    const f = document.querySelector('footer');
    return f ? f.innerText.slice(0, 800) : '(no <footer> tag)';
  });
  console.log('\n== footer text:', footerHtml);

  // ---- 3) user menu links ----
  console.log('\n== user menu probe');
  console.log('toggle #pjUserMenuToggle count:', await page.locator('#pjUserMenuToggle').count());
  await page.locator('#pjUserMenuToggle').click();
  await page.waitForTimeout(1500);
  const profileMenu = page.locator('.list-item--menu .profile-menu');
  console.log('profile-menu count:', await profileMenu.count());
  const visible = await profileMenu.first().isVisible().catch(() => false);
  console.log('profile-menu visible:', visible);
  const links = await profileMenu.locator('a').all();
  console.log('profile-menu link count:', links.length);
  for (const a of links) {
    const info = await a.evaluate((el) => ({
      href: el.getAttribute('href'),
      resolved: el.href,
      target: el.getAttribute('target'),
      onclick: !!el.getAttribute('onclick'),
      text: el.textContent.trim(),
    }));
    console.log(JSON.stringify(info));
  }
  // ĐÓNG menu bằng phím Escape (an toàn, không click mục nào)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  console.log('after Escape, profile-menu visible:', await profileMenu.first().isVisible().catch(() => false));

  // ---- 4) mọi external link http(s) trên trang ----
  console.log('\n== external links on page:');
  const externals = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (/^https?:/i.test(href)) {
        try {
          const u = new URL(a.href, location.href);
          if (u.hostname !== location.hostname) {
            out.push({ href, host: u.hostname, text: a.textContent.trim().slice(0, 60) });
          }
        } catch {}
      }
    });
    return out;
  });
  console.log(JSON.stringify(externals, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('PROBE ERROR:', e);
  process.exit(1);
});