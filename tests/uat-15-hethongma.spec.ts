import { test, expect } from '@playwright/test';

/**
 * SMOKE TEST — Phân hệ "HỆ THỐNG MÃ" (và danh mục liên quan) — UAT PJICO
 * App: https://uat-capdon.pjico.com.vn (Nền tảng cấp đơn bảo hiểm PJICO)
 *
 * Phạm vi: 19 trang danh mục / hệ thống mã:
 *   - CategorySystem: Unit, Department, UserAccount, Staff
 *   - CategoryOther: MenuIcon
 *   - CategoryInsurance: Customer, Agency
 *   - CategoryPushNotify: PushNotify
 *   - CategoryPerson: Benefit
 *   - ContractPerson: ProductPackages
 *   - FeeSchedule: FeeSchedule
 *   - CategoryCar: Manufacturer, Brand, CarType, CarGroup
 *   - CategoryProperty: PropertyGroup, PropertyGroupObject, PropertyPremiumRateTables
 *   - ReInsurance: location
 *
 * Mỗi test: goto trang → assert HTTP 200 → assert không phải trang lỗi server
 * → assert tiêu đề trang + 1 phần tử ổn định (input/select trên form chính) hiển thị.
 *
 * CHỈ ĐỌC: không bấm nút Lưu/Thêm mới/Xóa/Tìm kiếm, không thay đổi dữ liệu.
 * Session đã đăng nhập sẵn qua storageState mặc định '.auth/uat.json'.
 */

/** Helper smoke-check chung cho 1 trang hệ thống mã. */
async function smokeTrangHeThongMa(
  page: import('@playwright/test').Page,
  path: string,
  opts: { titleTrongBody: string | RegExp; selectorPhanTu?: string }
) {
  const resp = await page.goto(path, { timeout: 90000, waitUntil: 'domcontentloaded' });
  expect(resp?.status(), `HTTP status của ${path}`).toBeLessThan(400);

  // Không phải trang lỗi server (IIS/ASP.NET yellow page...)
  const bodyText = (await page.locator('body').innerText({ timeout: 30000 })) || '';
  expect(bodyText, `${path} không được hiển thị trang lỗi server`)
    .not.toMatch(/Server Error|Runtime Error|Exception \(code|HttpException|yellow screen/i);

  // Tiêu đề trang xuất hiện trong nội dung
  const body = page.locator('body');
  if (opts.titleTrongBody instanceof RegExp) {
    await expect(body).toContainText(opts.titleTrongBody, { timeout: 30000 });
  } else {
    await expect(body).toContainText(opts.titleTrongBody, { timeout: 30000 });
  }

  // Phần tử ổn định quan sát được ở probe (input/select form chính)
  if (opts.selectorPhanTu) {
    await expect(page.locator(opts.selectorPhanTu).first())
      .toBeVisible({ timeout: 30000 });
  }

  // Footer chung — có trên mọi trang nội dung của app
  // (Footer thật hiển thị "Tổng công ty cổ phần bảo hiểm Petrolimex - PJICO" — chữ thường,
  //  một số trang hiển thị in hoa trong dữ liệu bảng → so khớp không phân biệt hoa/thường.)
  await expect(body).toContainText(/tổng công ty cổ phần bảo hiểm petrolimex/i, { timeout: 30000 });
}

test.describe('Phân hệ HỆ THỐNG MÃ — UAT PJICO', () => {

  test('[HỆ THỐNG MÃ] Hệ thống mã đơn vị tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategorySystem/Unit', {
      titleTrongBody: 'Hệ thống mã đơn vị',
      // Form nhập (#MA) nằm trong modal ẩn #Detail_UPa_ct — chỉ mở khi bấm "Tạo mới",
      // nên assert phần tử luôn hiển thị của trang: bảng danh sách đơn vị
      // (table đầu tiên trong DOM là bảng rỗng ẩn → dùng :visible).
      selectorPhanTu: 'table:visible',
    });
  });

  test('[HỆ THỐNG MÃ] Hệ thống mã Phòng ban / Bộ phận tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategorySystem/Department', {
      titleTrongBody: 'Hệ thống mã Phòng ban / Bộ phận',
      selectorPhanTu: '#MA',
    });
  });

  test('[HỆ THỐNG MÃ] Quản lý tài khoản truy cập tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategorySystem/UserAccount', {
      titleTrongBody: 'Quản lý tài khoản truy cập',
      selectorPhanTu: '#PAS',
    });
  });

  test('[HỆ THỐNG MÃ] Hệ thống mã cán bộ tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategorySystem/Staff', {
      titleTrongBody: 'Hệ thống mã cán bộ',
      selectorPhanTu: '#MA_DVI',
    });
  });

  test('[HỆ THỐNG MÃ] Quản lý icon menu tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryOther/MenuIcon', {
      titleTrongBody: 'Quản lý icon menu',
      selectorPhanTu: '#pjMiHt',
    });
  });

  test('[HỆ THỐNG MÃ] Danh mục mã khách hàng tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryInsurance/Customer', {
      titleTrongBody: 'Danh mục mã khách hàng',
      selectorPhanTu: '#ten_tim',
    });
  });

  test('[HỆ THỐNG MÃ] Danh mục mã đại lý tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryInsurance/Agency', {
      titleTrongBody: 'Danh mục mã đại lý',
      selectorPhanTu: '#ten_tim',
    });
  });

  test('[HỆ THỐNG MÃ] Khai báo nội dung Push Notify tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryPushNotify/PushNotify', {
      titleTrongBody: 'Khai báo nội dung Push Notify',
      selectorPhanTu: '#TIEU_DE',
    });
  });

  test('[HỆ THỐNG MÃ] Hệ thống mã quyền lợi tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryPerson/Benefit', {
      titleTrongBody: 'Hệ thống mã quyền lợi',
      selectorPhanTu: '#ma_sp',
    });
  });

  test('[HỆ THỐNG MÃ] Hệ thống gói sản phẩm tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/ContractPerson/ProductPackages', {
      titleTrongBody: 'Hệ thống gói sản phẩm',
      selectorPhanTu: '#MA_SP',
    });
  });

  test('[HỆ THỐNG MÃ] Quản lý biểu phí xe cơ giới tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/FeeSchedule/FeeSchedule', {
      titleTrongBody: 'Quản lý biểu phí xe cơ giới',
      selectorPhanTu: '#ma_dvi',
    });
  });

  test('[HỆ THỐNG MÃ] Hãng xe ô tô (Manufacturer) tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryCar/Manufacturer', {
      titleTrongBody: 'Hãng xe ô tô',
      selectorPhanTu: '#MA',
    });
  });

  test('[HỆ THỐNG MÃ] Hiệu xe ô tô (Brand) tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryCar/Brand', {
      titleTrongBody: 'Hiệu xe ô tô',
      selectorPhanTu: '#HANG',
    });
  });

  test('[HỆ THỐNG MÃ] Mã Loại xe tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryCar/CarType', {
      titleTrongBody: 'Mã Loại xe',
      selectorPhanTu: '#MA',
    });
  });

  test('[HỆ THỐNG MÃ] Nhóm xe tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryCar/CarGroup', {
      titleTrongBody: 'Nhóm xe',
      selectorPhanTu: '#MA',
    });
  });

  test('[HỆ THỐNG MÃ] Mã nhóm tài sản, kỹ thuật tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryProperty/PropertyGroup', {
      titleTrongBody: 'Mã nhóm tài sản, kỹ thuật',
      selectorPhanTu: '#MA',
    });
  });

  test('[HỆ THỐNG MÃ] Mã nhóm đối tượng Tài sản tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryProperty/PropertyGroupObject', {
      titleTrongBody: 'Mã nhóm đối tượng Tài sản',
      selectorPhanTu: '#MA',
    });
  });

  test('[HỆ THỐNG MÃ] Biểu phí tài sản, kỹ thuật tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/CategoryProperty/PropertyPremiumRateTables', {
      titleTrongBody: 'Biểu phí tài sản, kỹ thuật',
      selectorPhanTu: '#lh_bh',
    });
  });

  test('[HỆ THỐNG MÃ] Mã địa điểm (Tái bảo hiểm) tải trang thành công', async ({ page }) => {
    test.setTimeout(120000);
    await smokeTrangHeThongMa(page, '/ReInsurance/location', {
      titleTrongBody: 'Mã địa điểm',
      selectorPhanTu: '#ma_tim',
    });
  });

});