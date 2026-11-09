# MultiCam Recorder — Team Base
Bộ khung phát triển cho bài tập Thu thập dữ liệu tập chuẩn AI. Có backend lưu dữ liệu thật, web Controller, app Remote, hợp đồng TypeScript, CI và tài liệu chia việc.

## Yêu cầu
Node.js 24 LTS (tối thiểu 24.3) + npm, Git. Camera/mobile cần điện thoại thật và Expo Go tương thích SDK 58 hoặc development build SDK 58. Không cần cài database riêng. Phiên bản SDK được ghim để nhóm dùng đồng nhất; SDK 58 đã được chọn để chạy với Expo Go SDK 58 trên iPhone. Không tự nâng riêng từng package.

## Chạy lần đầu (PowerShell hoặc Terminal, tại thư mục gốc)
```sh
npm ci
```
Copy apps/server/.env.example thành apps/server/.env. Đổi CONTROLLER_PASSWORD thành mật khẩu riêng ít nhất 12 ký tự; không commit .env. Để demo OTP local, thêm `DEV_OTP_ENABLED=true` vào server .env; mặc định false sẽ trả 503 khi chưa có adapter gửi mã. Không bật DEV khi NODE_ENV=production.
```sh
npm run seed
npm run dev:server
```
Mở terminal thứ hai:
```sh
npm run dev:controller
```
Mở http://localhost:5173, đăng nhập bằng CONTROLLER_EMAIL và mật khẩu đã cấu hình, bấm Tạo phòng.

## Chạy Remote
Copy apps/mobile/.env.example thành apps/mobile/.env. Đổi EXPO_PUBLIC_API_URL sang IP LAN của máy server, ví dụ http://192.168.1.10:3000; không dùng localhost trên điện thoại. Hai máy cùng Wi-Fi, firewall cho phép TCP 3000 và Metro theo thông báo Expo.
```sh
npm run dev:mobile
```
Mở bằng Expo Go SDK 58/development build SDK 58. Nhập họ, tên, email, điện thoại và mật khẩu để đăng ký Remote. Bấm gửi OTP đăng ký, nhập mã rồi xác thực trước khi đăng nhập. DEV hiển thị mã trong thông báo khi cấu hình server cho phép. Nhập mã phòng từ Controller (hoặc đọc QR bằng công cụ ngoài), bật đồng ý rồi join. Bấm tải danh sách máy ở Controller. Base chưa tự sync.
Nếu mở Controller từ máy khác, copy apps/controller/.env.example thành .env và sửa VITE_API_URL; đồng thời sửa CORS_ORIGIN của server thành origin giao diện, rồi restart.

## Kiểm tra
```sh
npm test
npm run typecheck
npm run build
```
CI chạy các lệnh này ở mỗi push/PR. Build ở đây là web Controller; không phải APK/IPA.

## Cấu trúc
- apps/server/src: API, SQLite, bảo mật và seed Controller.
- apps/controller: giao diện Controller React + Vite.
- apps/mobile: Remote React Native + Expo + SecureStore.
- packages/contracts: DTO chung, không chứa secret/logic server.
- docs/API.md: endpoint đã chạy và giới hạn.
- docs/ARCHITECTURE.md: quyết định, điểm cần hỏi thầy và cách mở rộng.
- docs/TEAM_BACKLOG.md: phân công và mốc tuần.

## Đưa cho nhóm
Tạo repository GitHub rỗng rồi chạy tại thư mục gốc (thay YOUR_ORG):
```sh
git init
git add .
git commit -m "chore: initialize MultiCam team base"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/multicam-recorder.git
git push -u origin main
```
Sau đó bật bảo vệ main theo CONTRIBUTING.md. Chưa có repository nào được tạo hoặc push tự động.

## Trạng thái Mốc 1
Đã có profile Remote, OTP signup/forgot_password, xác thực tài khoản, access + refresh
rotation, thu hồi phiên, đa thiết bị, seed Controller duy nhất và phân quyền server.
Controller giữ phiên khi reload cùng tab; Remote lưu phiên trong SecureStore.
Lỗi mạng không xóa phiên. Phòng có QR, consent, sức chứa, mã hết hạn và danh sách thủ công.
Migration tự nâng DB cũ, không xóa dữ liệu. Tài khoản legacy vẫn đăng nhập được; profile
legacy trống và token cũ cần login lại để có refresh. Backup DB trước khi nâng cấp.
Mở lại phòng hết hạn để gia hạn mã. Remote có thể rời phòng/thu hồi quyền bất kỳ lúc nào.

Chưa tích hợp nhà cung cấp email/SMS, chưa có UI quên mật khẩu, sync, command,
upload hay thư viện trên server. Người dùng đã xác nhận luồng Mốc 1. QR chứa mã mời
thuần; chưa triển khai quét QR trong app. Chi tiết: docs/API.md, docs/VALIDATION.md.

## Demo Windows (Mốc 1)
1. Dùng Node 24; tại `E:\multicam-base`, chạy `npm ci`.
2. Nếu chưa có .env, chạy `Copy-Item apps/server/.env.example apps/server/.env` và
   `Copy-Item apps/mobile/.env.example apps/mobile/.env`. Không chép đè .env hiện có.
3. Sửa mật khẩu Controller trong server .env (ít nhất 12 ký tự), bật DEV_OTP_ENABLED
   cho demo local. Cấu hình EXPO_PUBLIC_API_URL bằng IP LAN của máy server.
4. Chạy `npm run seed`, rồi `npm run dev:server`.
5. Terminal thứ hai: `npm run dev:controller`; mở http://localhost:5173, đăng nhập
   Controller, mở phòng, xem mã/QR và hạn mã.
6. Terminal thứ ba: `npm run dev:mobile`; mở bằng Expo Go SDK 58/development build SDK 58
   trên hai điện thoại cùng Wi-Fi. Đăng ký → gửi OTP → xác thực → đăng nhập → đồng ý join.
   Có thể đăng nhập cùng tài khoản trên hai cài đặt app để kiểm tra multi-device.
7. Tải danh sách thiết bị ở Controller; thử reload web, khởi động lại app, rời phòng
   một máy và logout máy còn lại. Các máy khác vẫn giữ phiên.
8. Dừng các terminal bằng Ctrl+C khi kết thúc demo.

Kiểm tra bundle Android riêng (không phải APK), từ apps/mobile:
`npx expo export --platform android --output-dir ../../.codex-local/mobile-export`.
Không đưa bundle, DB hoặc thông tin đăng nhập vào Git.

## Chạy lại trên iPhone sau khi nâng SDK 58

Giữ cấu hình `apps/mobile/.env` và dữ liệu hiện có. Đóng phiên Expo cũ bằng Ctrl+C,
rồi tại thư mục gốc chạy:

```powershell
npm ci
npm run dev:mobile:clear
```

React/ReactDOM của web cũng đã đồng bộ với Mobile: nếu web đang chạy, Ctrl+C ở terminal
web rồi chạy lại `npm run dev:controller`.
Lệnh clear xóa cache Metro và buộc mở bằng Expo Go. Backend ở cổng 3000 phải đang chạy;
iPhone và máy tính cùng Wi-Fi, EXPO_PUBLIC_API_URL dùng IPv4 LAN của máy tính.
Mở Expo Go SDK 58 trên iPhone, dùng Camera iPhone quét QR mới trong terminal Expo.
Cho phép Local Network nếu iOS hỏi. Không dùng QR mã phòng trên web để mở app.

Nếu Node hệ thống vẫn là 22, dùng runtime Node 24 tạm như các bước trước:

```powershell
npm exec --yes --package=node@24 --call "npm ci"
npm exec --yes --package=node@24 --call "npm run dev:mobile:clear"
```

Sau khi mở app, thử đăng ký → gửi OTP → xác thực → đăng nhập → join phòng.
Để nhận OTP DEV cần DEV_OTP_ENABLED=true trong server .env và restart backend sau khi sửa.
Nếu seed báo Controller đã tồn tại, email/mật khẩu trong DB vẫn được giữ; thay .env
không tự cập nhật tài khoản đã seed. Không xóa DB để đổi SDK hoặc sửa đăng nhập.

SDK upgrade theo [hướng dẫn Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
và [release notes SDK 58](https://expo.dev/changelog/sdk-58). Bundle iOS không thay thế
native build hoặc kiểm thử thật trên iPhone; xem docs/VALIDATION.md.

## Giao diện đăng ký Remote

Mở tab **Đăng ký**, điền họ, tên, điện thoại, email, mật khẩu và nhập lại mật khẩu.
Bấm **Tạo tài khoản & tiếp tục**: app tạo tài khoản, chuyển sang màn hình xác thực và
thử gửi OTP. Khi gửi thất bại, tài khoản vẫn đã tạo; ở lại bước xác thực và bấm gửi lại,
không đăng ký lại. Mã DEV được hiển thị riêng với nhãn thử nghiệm khi server bật DEV OTP.
Nút gửi lại có đếm ngược 120 giây. Xác thực thành công sẽ trở về đăng nhập, giữ email.
Tài khoản đã tạo nhưng chưa xác thực: vào tab Đăng nhập, nhập email rồi chọn
**Đã đăng ký nhưng chưa xác thực?** để tiếp tục bước OTP.

## Quay thử trên Remote (Mốc 2A)

Sau khi cập nhật dependency, khởi động lại terminal Expo từ thư mục gốc trên Windows.

```powershell
npm exec --yes --package=node@24 --call "npm run dev:mobile:clear"
```

Quét QR bằng iPhone có Expo Go SDK 58. Đăng nhập Remote và chọn **Camera và clip cục bộ**.
Cấp quyền camera và micro, đợi preview sẵn sàng, đổi camera, quay 5–10 giây rồi dừng.
Chờ **Đã lưu**, mở clip để kiểm tra cả hình và tiếng. Đóng và mở lại app, vào màn hình
camera để kiểm tra clip vẫn phát được. Bạn có thể quay thử khi đang ở trong hoặc ngoài phòng.

Clip QuickTime được giữ đuôi `.mov`. Clip nhận dạng là MP4 được lưu với đuôi `.mp4`.
Các bước nghiệm thu quyền, vào nền, lưu và kiểm tra codec trên máy tính nằm trong
[VALIDATION.md](docs/VALIDATION.md).
