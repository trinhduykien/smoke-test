# Smoke Test — UAT Portal PJICO

Bộ smoke test Playwright (28 spec) cho portal PJICO.

## Chạy test

```bash
npm install
cp .env.example .env        # dien UAT_EMAIL / UAT_PASS (file .env khong commit)
node scripts/save-auth.js   # tạo .auth/uat.json (session — không commit)
npx playwright test
```

## Tài liệu

- Báo cáo UAT đầy đủ: [UAT-SMOKE-REPORT.md](UAT-SMOKE-REPORT.md)