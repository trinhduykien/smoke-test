# Báo cáo smoke test UAT — PJICO cấp đơn

## 1. Thông tin chung

| Hạng mục | Giá trị |
|---|---|
| Ngày chạy | 2026-09-03 |
| Môi trường | UAT (https://uat-capdon.pjico.com.vn) |
| Tài khoản | kientd.pjico (TCT — TRINH DUY KIEN) |
| Tổng số test | 108 |
| Pass | 99 |
| Fail | 8 |
| Skip | 1 (có sẵn từ trước, không phải lỗi) |
| Kết luận suite | **CHƯA XANH** (suiteGreen: false) — 8 fail đều là bug thật của app/portal, được giữ nguyên FAIL theo quy trình không che giấu lỗi |

> **Cập nhật 2026-09-03 (vòng test chiều sâu):** suite mới gộp smoke + depth = **153 test — 141 pass / 12 fail**, vẫn **CHƯA XANH** (11 real-bug của app + 1 test cũ flaky). Chi tiết xem mục 8.

> **Cập nhật 2026-09-03 (vòng API data testing):** suite mới gộp smoke + depth + API = **192 test — 171 pass / 21 fail**, vẫn **CHƯA XANH** (cả 21 fail đều là real-bug của app, lặp lại 100% qua 2 lần chạy độc lập, không flaky). Chi tiết xem mục 9.

## 2. Tổng quan kết quả

- Vòng 1 (108 test): 79 pass / 28 fail / 1 skip. Phân loại 28 fail: 19 fail là TEST-BUG (assert footer sai hoa/thường + selector bảng ẩn ở spec Hệ thống mã), 1 fail FLAKY (click toggle menu tìm nhanh bị nuốt do app JS chưa bind handler), 8 fail là REAL-BUG.
- Đã sửa 2 file spec: `tests/uat-15-hethongma.spec.ts` (footer regex case-insensitive + selector `table:visible`), `tests/uat-02-dashboard-menu.spec.ts` (thêm `waitForLoadState('load')` + retry click). Không che giấu lỗi app.
- Vòng 2 chạy lại 2 file đã sửa: 20/20 pass.
- Suite cuối (108 test): **99 pass / 8 fail / 1 skip**. Không có env-issue: session `.auth/uat.json` ổn định suốt 2 vòng, không gặp redirect về login.

## 3. Kết quả theo phân hệ

| Phân hệ | Số test | Pass | Fail | Ghi chú |
|---|---|---|---|---|
| CẤP ĐƠN | 19 | 18 | 1 | 18/19 trang render đầy đủ; 1 bug thật ở /ContractAssetsMixed/Search (302 → ErrorHandler) |
| THANH TOÁN | 5 | 5 | 0 | Tất cả ổn; một số nút ghi dữ liệu hiển thị sẵn trên toolbar (không phải bug) |
| BỒI THƯỜNG (Claim) | 5 | 2 | 3 | Toàn bộ 3 trang /ClaimCargo/* lỗi server-side 302 → ErrorHandler |
| TÁI BẢO HIỂM | 10 | 10 | 0 | Tất cả render tốt; lưu ý input #so_hd ẩn thuộc form ẩn ở 2 trang Treaty |
| TIỆN ÍCH | 6 | 5 | 1 | /CoInsurance/CoInsuranceReconciliation trả HTTP 500 ổn định qua 3 lần quan sát |
| BÁO CÁO | 17 | 16 | 1 | /AppDashboard/DashBoard 302 → ErrorHandler; một số bất đồng nhất title nhỏ |
| HỆ THỐNG MÃ | 19 | 19 | 0 | Vòng 1 fail 19 do TEST-BUG (đã sửa spec), vòng 2 pass 20/20 (gồm cả file menu-user) |
| DASHBOARD & MENU & TÀI KHOẢN | 10 | 10 | 0 | Render tốt; nhiều "heading" nằm trong modal ẩn, phải assert phần tử thật |
| SECURITY (portal production) | 2 | 0 | 2 | capdon.pjico.com.vn và www.pjico.com.vn thiếu toàn bộ 6 security header chuẩn |
| SECURITY (app UAT — bổ sung sau) | 8 | 5 | 3 | 5 điểm mạnh (headers, access control, cookie chính, HSTS, thông báo login) — 3 lỗ hổng thật, xem mục 4.3 |
| CHIỀU SÂU (vòng depth 2026-09-03, xem mục 8) | 53 | 51 | 2 | 11 spec `uat-depth-*.spec.ts`; 2 fail đều là bug thật của app (script MIME /ErrorHandler/Index; modal Escape không đóng), không có test-bug |
| API DATA TESTING (vòng API 2026-09-03, xem mục 9) | 39 | 29 | 10 | 7 spec `uat-api-*.spec.ts`; 10 fail đều là real-bug của app (content-type text/html cho JSON toàn app; ảnh QR 302 → ErrorHandler; ClaimCargo API chết; lộ exception .NET; che lỗi phân quyền ở tầng HTTP status), không flaky |
| **Tổng (gồm security + chiều sâu + API)** | **192** | **171** | **21** | 1 skip có sẵn từ trước. Ghi chú: lượt chạy full-suite cuối (10 spec smoke + 11 spec depth + 7 spec API = 192 test, 1 lệnh `--workers=4`, ~3.4 phút) cho **171 pass / 21 fail** — 11 fail cũ + 10 fail API, cả 21 đều real-bug — xem mục 8, 9 |

## 4. Các trang CÓ VẤN ĐỀ thật — QUAN TRỌNG NHẤT cho dev

Tất cả các fail dưới đây đều deterministic (tái hiện ổn định qua nhiều lần probe + chạy test), KHÔNG phải flaky hay hết session.

### 4.1. Bug server-side trên UAT (5 endpoint)

| # | URL | Phân hệ | Mô tả lỗi |
|---|---|---|---|
| 1 | `https://uat-capdon.pjico.com.vn/ClaimCargo/SearchFTS` | BỒI THƯỜNG | Server redirect 302 ngay request đầu (kể cả không query string) → `/ErrorHandler/Index`: trang lỗi trắng chỉ chứa chữ "Trang thông báo lỗi", không render form/bảng/nút nào. Xác nhận qua 3 lần probe + 2 lượt chạy test. Khả năng exception server-side trong controller ClaimCargo hoặc thiếu phân quyền module hàng hóa. |
| 2 | `https://uat-capdon.pjico.com.vn/ClaimCargo/ObjectSearch` | BỒI THƯỜNG | Tương tự: 302 → `/ErrorHandler/Index`, trang lỗi trống. Có/không query string (SO_HD=...) đều lỗi như nhau. |
| 3 | `https://uat-capdon.pjico.com.vn/ClaimCargo/Search` | BỒI THƯỜNG | Tương tự với mọi biến thể query (SO_HD, ngayd/ngayc); kể cả action không tồn tại `/ClaimCargo/Index` cũng redirect về cùng trang lỗi → **toàn bộ controller ClaimCargo không truy cập được**, dù 3 link ClaimCargo vẫn hiển thị trong menu của tài khoản này, và `/ClaimPerson/Search` (module bồi thường khác) mở bình thường cùng tài khoản. |
| 4 | `/ContractAssetsMixed/Search` | CẤP ĐƠN | Server redirect HTTP 302 về `/ErrorHandler/Index`: trang lỗi trắng chỉ có chữ "Trang thông báo lỗi" (title "Index"), 0 input/select/button/table, không render form tìm kiếm, không có thông báo lỗi chi tiết. |
| 5 | `/CoInsurance/CoInsuranceReconciliation` | TIỆN ÍCH | HTTP 500, body "Error. An error occurred while processing your request." (tiêu đề rỗng, 0 form/bảng, chỉ còn footer). Lỗi tái hiện ổn định qua probe + 3 lần chạy test. |
| 6 | `/AppDashboard/DashBoard` | BÁO CÁO | Server redirect 302 → `/ErrorHandler/Index` (HTTP 200): trang lỗi rỗng chỉ hiển thị chữ "Trang thông báo lỗi" (title "Index"), không có menu/heading/bảng/nút nào. FAIL nhất quán qua 3 lượt chạy. |

**Đặc điểm chung cần dev lưu ý:** các trang 302 → `/ErrorHandler/Index` đều hiển thị trang lỗi trắng không có thông điệp lỗi cụ thể, không có nút quay lại — người dùng cuối không biết chuyện gì đã xảy ra. Vì các link vẫn hiện trong menu và không có thông báo "không có quyền" chuẩn, khả năng cao là server-side exception hơn là phân quyền chủ đích.

### 4.2. Security headers portal production (2 test)

| # | URL | Vấn đề |
|---|---|---|
| 7 | `https://capdon.pjico.com.vn/` (HTTP 200) | Thiếu cả 6 security header: `content-security-policy`, `strict-transport-security`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `permissions-policy`; lộ `server: nginx` và `x-powered-by: ASP.NET`; không có chống clickjacking (không X-Frame-Options, không CSP frame-ancestors). Deterministic qua 2 vòng chạy. |
| 8 | `https://www.pjico.com.vn/` (HTTP 200) | Thiếu cả 6 security header như trên; lộ `server: Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/5.6.40` và `x-powered-by: PHP/5.6.40` (lộ cả phiên bản phần mềm — rủi ro CVE đã biết của PHP 5.6 EOL). Deterministic qua 2 vòng chạy. |

### 4.3. Bảo mật chính app UAT — tests/uat-90-security.spec.ts (8 test, bổ sung sau vòng smoke)

**5 điểm MẠNH đã xác nhận (pass):**
- App UAT có đủ 6 security header chuẩn (CSP, HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — cấu hình tốt hơn hẳn portal production.
- HSTS `max-age=31536000; includeSubDomains` (1 năm) — đạt ngưỡng khuyến nghị.
- Kiểm soát truy cập: không session vào 3 trang nghiệp vụ (`/ContractCar/Search`, `/ClaimGeneral/Search`, `/CategorySystem/UserAccount`) đều bị đá về login, không lộ nội dung.
- Cookie phiên chính (`capdon.pjico`, `rt.capdon.pjico`) có đầy đủ `HttpOnly` + `Secure` + `SameSite=Strict`.
- Nhập sai mật khẩu (email đúng) → chỉ redirect về login với lý do chung chung, không hiện thông báo tiết lộ "mật khẩu sai" hay "email tồn tại".

**3 lỗ hổng THẬT (fail, giữ nguyên):**

| # | Lỗ hổng | Chi tiết | Rủi ro |
|---|---|---|---|
| 9 | **Account enumeration qua luồng đăng nhập 2 bước** | Nhập email KHÔNG tồn tại → ô mật khẩu không hiện (`#DIV_LOGIN` giữ hidden); email tồn tại → hiện ngay | Kẻ xấu dò được email nào có trong hệ thống (nhân viên/đại lý PJICO) → nền cho spear-phishing/brute-force có chủ đích |
| 10 | **`ASP.NET_SessionId` thiếu cờ Secure** | Cookie session có `HttpOnly` nhưng `secure=false` (các cookie chính đều có) | Cookie session có thể bị chặn/sniff nếu request nào đi qua HTTP hoặc downgrade; nên bật Secure cho toàn bộ cookie |
| 11 | **Lộ version phần mềm trong headers** | `server: nginx/1.20.1`, `x-powered-by: ASP.NET`, `x-aspnet-version: 4.0.30319` | Attacker tra CVE theo đúng version nginx/.NET; nên tắt các header này ở nginx config |

**Phương pháp:** thụ động, chỉ-đọc — đọc headers/cookies, quan sát UI đăng nhập, và đúng 1 lần nhập sai mật khẩu của chính tài khoản. Không gửi payload tấn công.

## 5. Các điểm bất thường quan sát được (không phải fail)

**CẤP ĐƠN:**
- `#pjMenuSearchInput` (ô tìm chức năng trong menu top) tồn tại nhưng ẩn mặc định trên mọi trang — không thể dùng để assert visible.
- `/ContractShip/Search` render chậm nhất (~12.6s) so với còn lại (1.2–4s).
- Các trang `ContractPerson/Search?loaibh=62` và `loaibh=6101` hiển thị cùng tiêu đề "Tìm hợp đồng chăm sóc sức khỏe" với `loaibh=69`, còn `loaibh=NG` hiển thị "Tìm hợp đồng Con người" — đúng thiết kế nghiệp vụ.
- Trang `tim-kiem-xe-may` dùng URL thân thiện (route rewrite) và vẫn hoạt động.
- Bảng kết quả nhiều trang hiển thị sẵn "Không có dữ liệu" khi load (không auto query) — bình thường.

**THANH TOÁN:**
- 3 trang công nợ (`/InsuranceFee/Debts`, `/CoInsurance/Debts`, `/InsuranceCommission/DebtsAgen`) hiển thị sẵn các nút ghi dữ liệu "Chèn dòng", "Cắt dòng đang chọn", "Cắt dòng không chọn", "Mới" ngay khi mới load trang tìm kiếm — người dùng dễ thao tác nhầm (đề xuất UX).
- `SearchInvoiceFTS` có sẵn nút "Phát hành hóa đơn" ngay cạnh nút Tìm kiếm; `SearchPaymentFts` hiển thị sẵn nút thu phí QRCODE và "XN thu phí".

**TÁI BẢO HIỂM:**
- Trên `/ReInsurance/InwardTreatyReinsurance` và `/ReInsurance/OutwardTreatyReinsurance`, input `#so_hd` tồn tại trong DOM nhưng luôn hidden (thuộc form ẩn) dù body text hiển thị nhãn "Số HD" — cần lưu ý khi viết test chi tiết hơn.

**TIỆN ÍCH:**
- Nút "Tìm kiếm" ở `/ContractPublic/BrowerEnd` là thẻ `<a class="btn btn-submit">` chứ không phải `<button>` — `getByRole('button')` không match.
- `/ContractRecive/Search` render rất nặng (21 bảng, nhiều tab) nhưng vẫn ổn định.

**BÁO CÁO:**
- Tiêu đề trang trong app là thẻ `<a class="titleContract">` chứ không phải h1–h4/.page-title.
- `/Report/BancasReport?bc=4` hiển thị heading "Báo cáo công nợ theo dòng xe" nhưng page `<title>` vẫn ghi "Báo cáo chi tiết doanh thu theo chương trình" (bất đồng nhất nhỏ); bc=1,2,3,5 giống nhau hoàn toàn về nội dung.
- Trang `/ContractCargo/SearchBCTLO` có `<title>` "Báo cáo doanh thu chi tiết" dù là trang nghiệp vụ hàng hóa (TLO) — trùng title với DetailedRevenueReport.
- Các trang PointReport/HealthReport render form bộ lọc nhưng 0 bảng dữ liệu ban đầu (bảng chỉ xuất hiện sau khi bấm "Xem báo cáo").

**DASHBOARD & MENU & TÀI KHOẢN:**
- Nhiều "heading" thực chất nằm trong modal `h4.modal-title` ẩn (ví dụ `#modal_MonthlyRevenue`) — probe innerText bắt được nhưng không hiển thị thật.
- Text menu chính trong DOM là "Cấp đơn/Thanh toán..." (không hoa), hiển thị hoa bằng CSS uppercase; ở viewport < 1600px một số mục menu bị gộp vào "THÊM" (overflow).
- Hành vi dropdown: HOVER mở panel thật; CLICK toggle lần 2 sẽ ĐÓNG panel.
- Nhãn mục con trong menu BỒI THƯỜNG không có dấu tiếng Việt ("Tim ho so FTS", "Tim doi tuong") — đúng text gốc của app.
- Trang `/Tienich/ChangePassword` là trang style riêng của VSIS (title "Đổi mật khẩu Email", có form OTP/captcha).

**SUITE chung:**
- Vòng 1 có 19 fail là TEST-BUG (assert footer hoa/thường; selector bảng ẩn/modal ở Hệ thống mã) và 1 fail FLAKY (click menu toggle bị nuốt khi app JS chưa bind) — đã sửa spec, không phải lỗi app.

## 6. Độ phủ & đề xuất các vòng test sau (từ critic)

### Độ phủ hiện tại

Độ phủ URL **gần như hoàn chỉnh về độ rộng**: toàn bộ 60 URL trang nội dung đều có test goto + assert HTTP + không lỗi server + element hiển thị. Chỉ 3 href chưa có test: `/Home/LogOut` (chủ ý bỏ — hành động đổi state session, hợp lý), link external chính sách bảo mật (`baohiem.pjico.com.vn/Chinh-sach-bao-mat-thong-tin-ca-nhan`), và footer `mailto:customercare.ipjico@petrolimex.com.vn`.

### Trạng thái 11 đề xuất từ critic — HOÀN TẤT ở vòng test chiều sâu (2026-09-03, chi tiết mục 8)

| # | Đề xuất từ critic | Trạng thái | Spec |
|---|---|---|---|
| 1 | Test điều hướng qua menu thật (hover menu → click mục con → assert URL/title trang đích) | HOÀN TẤT — 3/3 pass | `tests/uat-30-depth-menu-nav.spec.ts` |
| 2 | Test tìm nhanh chức năng (quick menu search: kết quả, click, Enter, từ khóa vô nghĩa) | HOÀN TẤT — 5/5 pass | `tests/uat-31-depth-quick-search.spec.ts` |
| 3 | Bắt console.error / pageerror khi load các trang chính | HOÀN TẤT — 4/5 pass (1 fail = bug thật) | `tests/uat-32-depth-console-error.spec.ts` |
| 4 | Kiểm tra chart dashboard render thật (SVG, tooltip, AJAX dữ liệu, resize) | HOÀN TẤT — 4/4 pass | `tests/uat-33-depth-chart.spec.ts` |
| 5 | Test modal "Xem chi tiết các tháng" (mở/đóng, phím Escape) | HOÀN TẤT — 3/4 pass (1 fail = bug thật) | `tests/uat-34-depth-modal.spec.ts` |
| 6 | Test grid + dữ liệu sau khi bấm Tìm kiếm (ContractCar, ClaimGeneral, Unit) | HOÀN TẤT — 4/4 pass | `tests/uat-35-depth-grid-search.spec.ts` |
| 7 | Test responsive / mobile menu (390px + 768px, drawer off-canvas) | HOÀN TẤT — 5/5 pass | `tests/uat-36-depth-mobile.spec.ts` |
| 8 | Test menu "THÊM" (overflow, panel "Các phân hệ khác") | HOÀN TẤT — 7/7 pass | `tests/uat-37-depth-more-menu.spec.ts` |
| 9 | Test submenu lồng "Hệ thống mã" / "Báo cáo" (thực tế là menu top-level riêng) | HOÀN TẤT — 6/6 pass | `tests/uat-38-depth-submenu.spec.ts` |
| 10 | Assert link external & LogOut (tồn tại + href, KHÔNG click) | HOÀN TẤT — 5/5 pass | `tests/uat-39-depth-external-links.spec.ts` |
| 11 | Giám sát response 5xx/4xx ngầm khi load 5 trang smoke | HOÀN TẤT — 5/5 pass (0 lỗi ngầm) | `tests/uat-40-depth-5xx-monitor.spec.ts` |

Tổng: 53 test mới (51 pass / 2 fail — cả 2 fail đều là bug thật của app được giữ FAIL có chủ đích). 11 đề xuất đều được thực hiện đúng phạm vi an toàn: chỉ hover/click điều hướng menu và bấm đúng nút Tìm kiếm/Tìm hồ sơ (query đọc, POST trả 200); không bấm bất kỳ nút ghi dữ liệu nào (Tạo mới/Lưu/Chấp nhận/Phát hành hóa đơn...).

### Vòng API data testing (2026-09-03) — HOÀN TẤT

7 spec `tests/uat-api-01-*.spec.ts` … `tests/uat-api-07-*.spec.ts`: **39 test — 29 pass / 10 fail**; cả 10 fail đều là real-bug của app được giữ FAIL có chủ đích (không hạ assertion), lặp lại ổn định qua 2 lần chạy, không flaky/test-bug (chi tiết mục 9). Phạm vi an toàn: chỉ gọi endpoint SEARCH/CATALOG/REGISTER read-only; mọi query dùng payload thật bắt qua browser (`waitForResponse`) — không tự bịa query, không gọi endpoint ghi dữ liệu.

**Còn thiếu sau vòng API (ghi nhận cho các vòng sau):**
- **Payload tìm kiếm mã hóa client-side** → chưa test được query tùy ý (lọc theo điều kiện nghiệp vụ thật: số HĐ, ngày, loại hình…). Hiện mới test được catalog + search với payload mặc định/rỗng và payload thật bắt được từ UI; cần giải mã/giả lập cơ chế encode của client để test query sâu.
- **Chưa có DB testing** — chờ tài khoản read-only (chỉ đọc) để đối chiếu dữ liệu API ↔ dữ liệu gốc trong DB, kiểm tra độ chính xác số liệu (đếm bản ghi, tổng doanh thu, mã đơn vị…).

### Còn thiếu / chưa làm (ghi nhận cho các vòng sau)

- `/Home/LogOut` và link external chính sách bảo mật vẫn CHỈ assert tồn tại + href, tuyệt đối không click (bảo toàn session — chủ đích, không phải thiếu sót).
- Giám sát 5xx/4xx (depth-11) chỉ bao quét request phát sinh lúc LOAD trang; chưa bao gồm request chỉ nảy sinh khi submit form, hover menu hoặc thao tác nghiệp vụ.
- Grid mới chỉ assert được trạng thái "Không có dữ liệu" (tài khoản test kientd.pjico không có hợp đồng/hồ sơ thật) — chưa kiểm tra render grid có dữ liệu, sắp xếp cột, export.
- 1 test cũ flaky còn tồn đọng: `uat-15-hethongma.spec.ts:145` (assert toBeVisible trên `<select id="ma_dvi">` gốc bị bootstrap-select ẩn) — spec cũ không được phép sửa, cần quyết định ở vòng sau.
- Phím Escape không đóng user menu (quan sát qua probe, chưa có test riêng — đã tránh assert để không tạo fail ngoài phạm vi).
## 7. Phụ lục: file liên quan

| Loại | File |
|---|---|
| Spec chính | `D:/bore/12/tests/uat-10-capdon.spec.ts`, `uat-11-thanhtoan.spec.ts`, `uat-12-bothuong.spec.ts`, `uat-13-taibh.spec.ts`, `uat-14-tienich.spec.ts`, `uat-16-baocao.spec.ts`, `uat-02-dashboard-menu.spec.ts`, `uat-15-hethongma.spec.ts`, `capdon-security.spec.ts`, `pjico-security.spec.ts` |
| Spec đã sửa trong vòng này | `d:/bore/12/tests/uat-15-hethongma.spec.ts` (footer regex + selector Unit), `d:/bore/12/tests/uat-02-dashboard-menu.spec.ts` (waitForLoadState + retry click) |
| Session auth | `.auth/uat.json` (tạo bởi `scripts/save-auth.js`) |

## 8. Vòng test chiều sâu (2026-09-03)

### 8.1. Kết quả 11 khu vực test chiều sâu

| # | Khu vực | Spec | Số test | Pass | Fail | Finding |
|---|---|---|---|---|---|---|
| 1 | Điều hướng qua menu thật (hover menu → click mục con → URL/title trang đích) | `tests/uat-30-depth-menu-nav.spec.ts` | 3 | 3 | 0 | 0 |
| 2 | Tìm nhanh chức năng — kết quả quick menu search | `tests/uat-31-depth-quick-search.spec.ts` | 5 | 5 | 0 | 0 |
| 3 | Console error / pageerror (5 trang chính) | `tests/uat-32-depth-console-error.spec.ts` | 5 | 4 | 1 | 1 (script MIME /ErrorHandler/Index) |
| 4 | Dashboard chart render thật (/Home/Index) | `tests/uat-33-depth-chart.spec.ts` | 4 | 4 | 0 | 1 ghi nhận (cùng lỗi script MIME, không ảnh hưởng chart) |
| 5 | Modal "Xem chi tiết các tháng" (#modal_MonthlyRevenue) | `tests/uat-34-depth-modal.spec.ts` | 4 | 3 | 1 | 1 (Escape không đóng modal) |
| 6 | Grid + dữ liệu sau Tìm kiếm (ContractCar, ClaimGeneral, Unit) | `tests/uat-35-depth-grid-search.spec.ts` | 4 | 4 | 0 | 0 |
| 7 | Responsive / mobile menu (390px mobile + 768px tablet) | `tests/uat-36-depth-mobile.spec.ts` | 5 | 5 | 0 | 2 (tràn ngang tạm thời + aria-label không cập nhật) |
| 8 | Menu "THÊM" (overflow, panel "Các phân hệ khác") | `tests/uat-37-depth-more-menu.spec.ts` | 7 | 7 | 0 | 0 |
| 9 | Menu "Hệ thống mã" / "Báo cáo" (top-level riêng, không phải submenu lồng) | `tests/uat-38-depth-submenu.spec.ts` | 6 | 6 | 0 | 0 |
| 10 | Link external & LogOut (chỉ assert, không click) | `tests/uat-39-depth-external-links.spec.ts` | 5 | 5 | 0 | 0 |
| 11 | Giám sát response 5xx/4xx ngầm khi load 5 trang smoke | `tests/uat-40-depth-5xx-monitor.spec.ts` | 5 | 5 | 0 | 0 |
| | **Tổng depth** | **11 spec** | **53** | **51** | **2** | **4 finding** |

Cả 2 fail của vòng depth đều là **bug thật của app**, được viết với kỳ vọng ĐÚNG và giữ FAIL có chủ đích (không hạ assertion, không filter lỗi thật). Không có test-bug hay flaky nào trong 11 spec depth mới (0 vòng sửa spec).

### 8.2. Finding mới của vòng chiều sâu

**Finding là bug thật (kèm test FAIL):**

| # | Finding |Severity | URL / vị trí | Mô tả |
|---|---|---|---|---|
| 1 | **JS crash ở mức console: script /ErrorHandler/Index bị chặn execute** | bug-có-thể | `/Home/Index` (xuất hiện trên mọi trang) | Console.error ổn định 5/5 lần chạy: "Refused to execute script from '/ErrorHandler/Index' because its MIME type ('text/html') is not executable". Trang chủ inject động `<script src="/ErrorHandler/Index">` lúc load (script tag không có trong HTML tĩnh, bị gỡ khỏi DOM sau khi load thất bại — hành vi kiểu $.getScript); endpoint trả HTTP 200 với Content-Type text/html thay vì file JS nên Chrome chặn → toàn bộ code mà script đó lẽ ra cung cấp không bao giờ được nạp. Lỗi thật của app (script reference/MIME sai), KHÔNG filter noise — test depth-03 giữ FAIL đúng kỳ vọng. |
| 2 | **Modal #modal_MonthlyRevenue KHÔNG đóng khi bấm Escape** | bug-có-thể | `/Home/Index` (nút "Xem chi tiết các tháng") | Modal bootstrap chuẩn (có .close data-dismiss, có .modal-backdrop) nhưng keydown Escape không được xử lý dù focus đã trong modal (heading) — khởi tạo .modal() thiếu keyboard:true hoặc thiếu handler Escape. Kỳ vọng chuẩn bootstrap: Escape phải đóng. Hiện chỉ đóng được bằng nút ×. Ổn định qua 2 lần chạy → FAIL có chủ đích. |

**Finding được ghi nhận nhưng test vẫn pass (khiếm khuyết nhỏ, tự phục hồi):**

| # | Finding | URL / vị trí | Mô tả |
|---|---|---|---|
| 3 | Tràn ngang tạm thời (scrollbar mobile) lúc tải trang ở viewport 390px | `/Home/Index` @ 390x844 | document.scrollWidth = 440 > clientWidth = 390 do `ul.d-flex.mb-0` (khối link header) rộng 491px tràn bên phải → horizontal scrollbar nhấp nháy lúc mới vào trang; app tự co về 390px sau ~500ms nên trạng thái ổn định KHÔNG có scrollbar (test pass với kỳ vọng đúng). |
| 4 | aria-label nút menu mobile không cập nhật theo trạng thái | `/Home/Index` — #pjMobileMenuToggle | aria-expanded đúng (false/true) nhưng aria-label luôn giữ "Mở menu" kể cả khi menu đang mở — người dùng screen-reader không được báo "Đóng menu". |

**Quan sát không phải bug (đã loại khỏi finding):** link "Chính sách bảo mật" mở CÙNG TAB với app (target=null, không có rel="noopener") — ghi chú UX; nhãn menu "Tra cứu HĐ bảo hiểm" (/Profit/CASearchObjects) không khớp tên trang đích "Tìm Thông tin người được bảo hiểm" (bất nhất naming); ContractCar hiển thị pagination "‹ ›" ngay cả khi 0 dòng kết quả (ClaimGeneral ẩn khi 0 dòng); menu top bar render bằng JS SAU sự kiện load (phải chờ toggle xuất hiện); "Hệ thống mã"/"Báo cáo" thực chất là menu top-level riêng chứ không phải submenu lồng của TIỆN ÍCH.

**Giám sát endpoint 5xx/4xx ngầm (khu vực 11):** KHÔNG phát hiện thêm lỗi nào — 0 response ≥ 400 và 0 response ≥ 500 trên cả 5 trang (/ContractCar/Search, /ClaimGeneral/Search, /InsuranceFee/SearchPaymentFts, /Report/HealthReport, /Home/Index), tất cả đạt networkidle trong 5s. Endpoint 500 duy nhất đã biết (CoInsurance/CoInsuranceReconciliation) là từ vòng smoke (mục 4.1). Giới hạn: chỉ giám sát request phát sinh khi load trang, chưa bao gồm request khi submit form/hover menu.

### 8.3. TỔNG suite mới (smoke + depth) — kết quả cuối cùng

- Đã chạy `node scripts/save-auth.js` làm mới session (OK) trước full suite.
- Full suite: **20 spec files = 10 spec smoke cũ (100 test) + 11 spec depth mới (53 test) = 153 test**, chạy 1 lần `npx playwright test --project=chromium --workers=4 --reporter=list` (~2.7 phút): **141 pass / 12 fail**.
- Phân loại 12 fail: **11 real-bug của app + 1 flaky của test cũ**:
  - 6 endpoint lỗi server (tái hiện ổn định 2 lần chạy): 5 trang redirect về `/ErrorHandler/Index` — /Report/AppDashboard, /ClaimCargo/SearchFTS, /ClaimCargo/ObjectSearch, /ClaimCargo/Search, /ContractAssetsMixed/Search; và 1 trang HTTP 500 — CoInsuranceReconciliation (xem mục 4.1).
  - 3 lỗi security (xem mục 4.3): header `server: nginx/1.20.1` lộ phiên bản; cookie `ASP.NET_SessionId` thiếu cờ Secure; enumeration email ở luồng login 2 bước.
  - 2 finding depth (mục 8.2): console script MIME /ErrorHandler/Index; modal Escape không đóng.
  - 1 flaky (test cũ, KHÔNG được phép sửa): `uat-15-hethongma.spec.ts:145` — fail ở full-suite (workers=4), pass ở rerun 1, fail ở rerun 2 vì assert toBeVisible trên `<select id="ma_dvi">` gốc bị bootstrap-select ẩn.
- Không sửa bất kỳ spec nào trong vòng này; 2 fail depth tái hiện ổn định ở rerun và là lỗi thật của app theo đúng kỳ vọng finding → giữ FAIL, không che giấu.
- **Kết luận: suiteGreen = false** (11 real-bug của app còn tồn tại + 1 test cũ flaky).

### 8.4. File liên quan vòng depth

| Loại | File |
|---|---|
| Spec depth (11 file) | `d:/bore/12/tests/uat-30-depth-menu-nav.spec.ts` … `uat-40-depth-5xx-monitor.spec.ts` |
| Probe | `d:/bore/12/probe-depth-01-menu-nav.js` … `probe-depth-11-5xx-monitor.js` (kèm các bản b/c/d chi tiết) |
| Screenshot | `test-results/depth05-modal-open.png`, `depth05-modal-closed.png` |
| Session auth | `.auth/uat.json` (làm mới trước full suite bằng `scripts/save-auth.js`) |

## 9. API data testing (2026-09-03)

Vòng test API tầng dữ liệu: 7 spec `tests/uat-api-01-*.spec.ts` … `uat-api-07-*.spec.ts` — **39 test, 29 pass / 10 fail**. Đã làm mới session bằng `node scripts/save-auth.js` (OK, về /Home/Index) trước khi chạy; API specs chạy riêng với `--workers=2`, sau đó chạy trọn full suite 1 lệnh `--workers=4` (~3.4 phút): **192 test — 171 pass / 21 fail, suiteGreen = false**. Cả 10 fail API đều lặp lại 100% giống nhau qua 2 lần chạy độc lập → KHÔNG flaky, KHÔNG test-bug, không sửa/hạ assertion nào — tất cả 10 fail đều là **real-bug** với kỳ vọng ĐÚNG được giữ nguyên làm finding.

### 9.1. Kết quả 7 khu vực API

| # | Khu vực | Spec | Số test | Pass | Fail | Finding |
|---|---|---|---|---|---|---|
| 1 | API phân hệ cấp đơn xe cơ giới (ContractCar/ContractPublic) | `tests/uat-50-api-contractcar.spec.ts` | 4 | 3 | 1 | 3 (content-type text/html cho payload JSON) |
| 2 | API phân hệ bồi thường (ClaimPublic/ClaimGeneral/ClaimCargo) — focus quyền truy cập | `tests/uat-51-api-claim.spec.ts` | 6 | 3 | 3 | 3 (che lỗi phân quyền ở tầng HTTP status; content-type; ClaimCargo API chết hoàn toàn) |
| 3 | API Dashboard doanh thu (/Dashboard/RegisterTSO + GeneratedRevenue) | `tests/uat-52-api-dashboard.spec.ts` | 6 | 4 | 2 | 2 (content-type; lộ exception .NET thô) |
| 4 | API hệ thống mã (/CategorySystem/UnitRegister, UnitSearch) | `tests/uat-53-api-hethongma.spec.ts` | 5 | 3 | 2 | 2 (content-type x2; schema chuẩn, không bug quyền/schema) |
| 5 | API báo cáo CSSK + thanh toán + QR | `tests/uat-54-api-baocao-thanhtoan-qr.spec.ts` | 5 | 3 | 2 | 2 (ảnh QR 302 → ErrorHandler; content-type) |
| 6 | API robustness — payload xấu trên 5 endpoint catalog | `tests/uat-55-api-robustness.spec.ts` | 5 | 5 | 0 | 1 ghi nhận (không crash nhưng endpoint không validate body) |
| 7 | API menu fragment /khud/MenuRegister + audit envelope 4 endpoint | `tests/uat-56-api-menu-endpoint.spec.ts` | 8 | 8 | 0 | 2 (content-type; envelope `message` không nhất quán kiểu dữ liệu) |
| | **Tổng API** | **7 spec** | **39** | **29** | **10** | **15 finding (10 test FAIL = real-bug)** |

Các điểm hoạt động ĐÚNG đã xác nhận (pass): catalog ContractCar (5 danh mục không rỗng, MA chuỗi hợp lệ), catalog ClaimPublic (schema chuẩn, đủ envelope), UI↔API ClaimGeneral (bắt được /ClaimGeneral/ListSearch khi bấm "Tìm hồ sơ", envelope parse được), Dashboard doanh thu (RegisterTSO + GeneratedRevenue trả đủ dữ liệu, so khớp API↔chart: 5 đơn vị = 5 nhãn trục x = 5 điểm/series), hệ thống mã (67 bản ghi 4 cột đúng định dạng, 10 bản ghi đầu khớp grid, phân trang client-side ceil(67/10)=7), PaymentFtsRegister/FindNGRegister/BranchUnitQRCODESearch (code 000, catalog đầy đủ), menu fragment (đủ 5 menu chính trên 3 trang, nội dung giống hệt khi GET trực tiếp), robustness (20/20 case payload xấu không crash), envelope audit (đủ 4 trường code/message/systemMessage/data, không endpoint thiếu trường).

### 9.2. Finding API mới

**3 finding quan trọng nhất cần dev ưu tiên:**

| # | Finding | URL / vị trí | Mô tả |
|---|---|---|---|
| 1 | **Che lỗi phân quyền ở tầng API — code 400 nhưng HTTP 200** | `POST /ClaimGeneral/ListSearch` (trigger bằng nút "Tìm hồ sơ" trên /ClaimGeneral/Search) | API trả JSON envelope **code 400** kèm message từ chối quyền: "NSD KTTT_0000000309 DVI TCT **Chua duoc cap quyen su dung nghiep vu Xu ly boi thuong phan he BH chua co quyen BT,NX**" — nhưng **HTTP status vẫn 200** và Content-Type text/html. Hệ quả: mọi kênh giám sát/log dựa HTTP status code sẽ thấy request "thành công", hoàn toàn không phát hiện được truy cập bị từ chối — lỗi quyền gần như vô hình với vận hành/monitoring. Về phía UI: test 02.5 xác nhận khi API trả code 400, app **HIỆN THỊ modal "Thông báo"** chứa đầy đủ message lỗi quyền (grid không bị che thành "Không có dữ liệu" trong luồng này) — người dùng cuối có thấy lỗi, nhưng tầng transport thì không. Test 02.4 (kỳ vọng content-type JSON) FAIL vì hành vi thật này. |
| 2 | **Toàn bộ endpoint JSON trả Content-Type "text/html; charset=utf-8" thay vì "application/json"** | `POST /ContractCar/RegisterSearch`, `POST /ContractPublic/SearchResult`, `POST /ContractPublic/BrowserRegister`, `POST /ClaimPublic/ListRegisterOther`, `POST /ClaimGeneral/ListSearch`, `POST /Dashboard/RegisterTSO`, `POST /Dashboard/GeneratedRevenue`, `POST /CategorySystem/UnitRegister`, `POST /CategorySystem/UnitSearch`, `POST /InsuranceFee/PaymentFtsRegister`, `POST /ContractPerson/FindNGRegister`, `POST /QRCODEBase/BranchUnitQRCODESearch` | Lỗi hệ thống toàn app: body là JSON envelope hợp lệ (code 000, data đầy đủ, parse được) nhưng header lại gán nhãn HTML. Client bắt buộc phải sniff body mới biết là JSON; mọi HTTP client/proxy/cache/WAF xử lý theo content-type sẽ phân loại sai response (rủi ro MIME-sniffing, khó tích hợp). Xác nhận trên cả baseline lẫn case payload xấu, qua ít nhất 5 khu vực test độc lập. 8 test audit content-type (viết kỳ vọng ĐÚNG application/json) FAIL có chủ đích làm finding. |
| 3 | **Ảnh QR thu phí hỏng: GET /InsuranceFee/qrcode 302 → ErrorHandler thay vì trả ảnh** | `GET https://uat-capdon.pjico.com.vn/InsuranceFee/qrcode` (bắn ngay khi load trang Tra cứu thông tin thanh toán /InsuranceFee/SearchPaymentFts) | Server trả **HTTP 302 kèm Location: /ErrorHandler/Index**, body sau redirect là trang HTML "Trang thông báo lỗi" — thay vì HTTP 200 + content-type `image/*`. Người dùng sẽ thấy **ảnh QR bị vỡ/không hiển thị** trên trang tra cứu thanh toán: dấu hiệu endpoint sinh QR thu phí lỗi phía server (cùng cơ chế lỗi với nhóm trang 302 → ErrorHandler ở mục 4.1). |

**Các finding robustness (khu vực 06):**

| # | Finding | URL / vị trí | Mô tả |
|---|---|---|---|
| 4 | Robustness TỐT: không endpoint nào crash với payload xấu — nhưng không có input validation | 5 endpoint catalog: `/ContractCar/RegisterSearch`, `/ContractPublic/BrowserRegister`, `/ClaimPublic/ListRegisterOther`, `/InsuranceFee/PaymentFtsRegister`, `/CategorySystem/UnitRegister` | 20 case payload xấu (body rỗng, `{"data":12345}`, text garbage, `{"data":"@@@not-valid-base64@@@","cot":"ma"}`) đều trả HTTP 200 + JSON envelope code "000" parse được — 5/5 test PASS ngay vòng đầu. Tuy nhiên (ghi nhận thiết kế, không phải finding crash): endpoint catalog **hoàn toàn KHÔNG đọc/validate body** — bỏ qua mọi payload rác và vẫn trả full data danh mục thay vì 400/code lỗi business → an toàn trước lỗi định dạng nhưng không có input validation. Tổng 25 request (5 baseline + 20 case xấu), đúng 1 request/case, không hammer, không gửi SQL/XSS. |

**Các finding schema lệch / envelope (khu vực 03, 07, 02):**

| # | Finding | URL / vị trí | Mô tả |
|---|---|---|---|
| 5 | **Lộ exception .NET thô cho người gọi API** | `POST /Dashboard/RegisterTSO` (payload rỗng) | Server trả code "400" kèm message thô của .NET framework: "**Value cannot be null. Parameter name: input**" (ArgumentNullException) — lộ chi tiết exception nội bộ thay vì thông báo nghiệp vụ tiếng Việt; HTTP status vẫn 200. Test 03.6 FAIL vì hành vi thật này. |
| 6 | **Envelope `message` không nhất quán kiểu dữ liệu giữa các endpoint** | `/InsuranceFee/PaymentFtsRegister`, `/CategorySystem/UnitRegister` (so với `/ContractCar/RegisterSearch`, `/ClaimPublic/ListRegisterOther`) | Cùng code="000" thành công nhưng `/ContractCar/RegisterSearch` và `/ClaimPublic/ListRegisterOther` trả `message=""` (chuỗi rỗng), còn `/InsuranceFee/PaymentFtsRegister` và `/CategorySystem/UnitRegister` trả `message=null` → API contract không đồng nhất giữa các endpoint. |
| 7 | **API phân hệ bồi thường hàng hóa marine (ClaimCargo) chết hoàn toàn** | `POST /ClaimCargo/ListSearch` (read-only, postData rỗng) | Trả HTTP 200 với trang HTML "Trang thông báo lỗi" của ErrorHandler — không phải JSON envelope theo quy ước toàn app; trang /ClaimCargo/Search cũng 302 về ErrorHandler nên không thao tác UI sinh payload được. Khớp chính xác 3 finding UI ở mục 4.1 (3 trang ClaimCargo 302 → ErrorHandler). Test 02.6 FAIL vì hành vi thật này. |
| 8 | Envelope ĐỦ trường — không có finding thiếu trường schema | 4 endpoint catalog (ContractCar/RegisterSearch, ClaimPublic/ListRegisterOther, InsuranceFee/PaymentFtsRegister, CategorySystem/UnitRegister) | Audit 8/8 test PASS: mọi endpoint trả đủ 4 trường code/message/systemMessage/data (keys thực còn có thêm "Total"), code==="000", data != null — KHÔNG có bug thiếu trường envelope. Đây là kết quả âm tính được xác nhận, không phải bỏ qua. |

**Lưu ý về dữ liệu Dashboard (khu vực 03):** số đơn vị hiển thị trên chart phụ thuộc dữ liệu từng ngày (lượt trước 18 điểm, lượt này 5 đơn vị TCT/AGI/BNI/BPH/HNO với 10 điểm cột) → test 03.4 so khớp tương đối (điểm/series = số đơn vị trong bảng kq_dtth) thay vì hard-code con số tuyệt đối; GeneratedRevenue trả kq_dtth là chuỗi HTML table + mảng cấu trúc chart (b_dt_2/kq_truc_x_2/dt_ten_2), số liệu "463,461,843"/"120.4%" parse được sau bỏ dấu phẩy và %.

### 9.3. Phạm vi an toàn & phương pháp

- Chỉ gọi endpoint **SEARCH/CATALOG/REGISTER** (đọc, trả 200) và click đúng nút "Tìm kiếm"/"Tìm hồ sơ" — **không thao tác ghi dữ liệu nào** (không bấm Tạo mới/Lưu/Chấp nhận/Phát hành hóa đơn...).
- Quy ước payload mã hóa client-side được tuân thủ: mọi request query đều bắt qua browser thật (`waitForResponse`) khi trang load hoặc khi bấm nút, không tự bịa query — chỉ các endpoint catalog (chấp nhận postData rỗng) mới gọi trực tiếp qua `context.request`.
- 2 vòng chạy (API riêng `--workers=2` + full suite `--workers=4`): kết quả giống nhau 100%, không flaky, không vòng sửa spec nào, không hạ assertion.

### 9.4. File liên quan vòng API

| Loại | File |
|---|---|
| Spec API (7 file) | `D:/bore/12/tests/uat-50-api-contractcar.spec.ts`, `uat-51-api-claim.spec.ts`, `uat-52-api-dashboard.spec.ts`, `uat-53-api-hethongma.spec.ts`, `uat-54-api-baocao-thanhtoan-qr.spec.ts`, `uat-55-api-robustness.spec.ts`, `uat-56-api-menu-endpoint.spec.ts` |
| Probe | `D:/bore/12/probe-api-01-contractcar.js`, `probe-api-02-claim.js`, `probe-api-04-hethongma.js`, `probe-api-06-robustness.js`, `probe-api-07-menu-endpoint.js` (kèm probe khu vực 03, 05) |
| Session auth | `.auth/uat.json` (làm mới bằng `scripts/save-auth.js` trước khi chạy) |