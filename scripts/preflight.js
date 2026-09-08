// Kiểm tra nhanh trước khi chạy test — tự chẩn đoán các lỗi phổ biến
// Chạy: node scripts/preflight.js
// Thoát với mã 1 nếu thiếu điều kiện, kèm hướng dẫn sửa bằng tiếng Việt.
const fs = require('fs');
const https = require('https');

const UAT_HOST = 'https://uat-capdon.pjico.com.vn';

async function main() {
  let coLoi = false;
  const bao = (ok, dong, huongDan) => {
    console.log((ok ? '  [OK]  ' : '  [LỖI] ') + dong);
    if (!ok) { console.log('         → ' + huongDan); coLoi = true; }
  };

  console.log('=== PREFLIGHT — kiểm tra điều kiện chạy smoke test UAT PJICO ===\n');

  // 1. Node.js >= 18
  const major = parseInt(process.versions.node.split('.')[0], 10);
  bao(major >= 18, `Node.js >= 18 (hiện tại: ${process.versions.node})`,
    'Cài Node.js LTS mới từ https://nodejs.org rồi chạy lại');

  // 2. File .env có tài khoản
  let coEnv = false;
  try {
    for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.+)\s*$/);
      if (m && m[1] === 'UAT_EMAIL' && m[2]) coEnv = true;
    }
  } catch {}
  bao(coEnv, 'File .env có UAT_EMAIL / UAT_PASS',
    'Chạy: cp .env.example .env  rồi điền tài khoản UAT của bạn (file không commit kèm repo)');

  // 3. Đến được máy chủ UAT (mạng nội bộ PJICO / VPN)
  console.log('  [..]  Đang thử truy cập ' + UAT_HOST + ' (tối đa 10s)...');
  const denUAT = await new Promise(resolve => {
    const req = https.get(UAT_HOST + '/Home/Index', { timeout: 10000 }, res => {
      res.resume();
      resolve(res.statusCode ? res.statusCode < 500 : false);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
  bao(denUAT, 'Truy cập được ' + UAT_HOST,
    'Máy chủ UAT chỉ vào được từ mạng nội bộ PJICO hoặc VPN — kết nối VPN rồi chạy lại');

  // 4. Browser Chromium của Playwright
  let coBrowser = false;
  try {
    const { chromium } = require('@playwright/test');
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    coBrowser = true;
  } catch {}
  bao(coBrowser, 'Chromium của Playwright đã cài',
    'Chạy: npx playwright install');

  // 5. Session .auth/uat.json
  bao(fs.existsSync('.auth/uat.json'), 'File session .auth/uat.json tồn tại',
    'Chạy: node scripts/save-auth.js (cần .env hợp lệ ở bước trên)');

  console.log('\n=== KẾT QUẢ ===');
  if (coLoi) {
    console.log('Còn thiếu điều kiện — sửa theo hướng dẫn [LỖI] ở trên rồi chạy lại preflight.');
    process.exit(1);
  } else {
    console.log('Đủ điều kiện. Chạy test bằng: npx playwright test');
  }
}

main().catch(e => { console.error('LỖI preflight:', e.message); process.exit(1); });