# Smoke Test — UAT Portal PJICO

Bộ smoke test Playwright (28 spec) cho portal PJICO.

## Yêu cầu trước khi chạy

1. **Node.js ≥ 18** (kiểm tra: `node -v`)
2. **Tài khoản UAT PJICO hợp lệ** — repo không kèm tài khoản (`.env` bị gitignore). Tài khoản cần **đủ quyền xem các menu**: Cấp đơn, Thanh toán, Bồi thường, Tái bảo hiểm, Tiện ích (nhiều test assert theo menu đầy đủ)
3. **Mạng nội bộ PJICO hoặc VPN** — máy phải mở được `https://uat-capdon.pjico.com.vn` bằng trình duyệt

## Chạy test

```bash
npm install
npx playwright install     # tải Chromium (~150MB) — BẮT BUỘC, chỉ chạy 1 lần
cp .env.example .env       # điền UAT_EMAIL / UAT_PASS của bạn (file .env không commit)
node scripts/save-auth.js   # tạo .auth/uat.json (session) — phải hiện "OK" mới được
npx playwright test
```

Kiểm tra nhanh mọi điều kiện trước khi chạy (tự chỉ ra thiếu gì và cách sửa):

```bash
node scripts/preflight.js
```

Mở report sau khi chạy: `npm run report`

## Lỗi thường gặp

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| `Executable doesn't exist` | máy chưa tải browser | `npx playwright install` |
| `Thieu UAT_EMAIL / UAT_PASS` | chưa tạo `.env` | `cp .env.example .env` rồi điền tài khoản |
| `net::ERR_CONNECTION_TIMED_OUT` / goto timeout 90s | không vào được mạng PJICO | kết nối VPN / mạng nội bộ rồi chạy lại |
| Toàn bộ test fail sau ~1 giây | chưa có `.auth/uat.json` (chưa chạy save-auth hoặc save-auth fail) | `node scripts/save-auth.js` — phải thấy "OK — session đã lưu" |
| uat-01 fail ở `#DIV_LOGIN hidden` | `.env` trống hoặc tài khoản sai | kiểm tra lại UAT_EMAIL / UAT_PASS trong `.env` |
| Login fail liên tục | tài khoản bị khóa (sai mật khẩu nhiều lần) | liên hệ quản trị UAT mở khóa |
| Test menu fail dù login OK | tài khoản thiếu quyền/menu khác QA | xin tài khoản có đủ 5 menu chính; hoặc khai báo đúng tên hiển thị trong `UAT_FULLNAME` |

**Ghi chú:** test "sai mật khẩu" (uat-90) chỉ chạy khi đặt `QA_WRONG_PW=1` trong `.env` — mỗi lần chạy ĐÚNG 1 lần nhập sai trên chính tài khoản bạn, để tránh bị khóa tài khoản.

## Tài liệu

- Báo cáo UAT đầy đủ: [UAT-SMOKE-REPORT.md](UAT-SMOKE-REPORT.md)