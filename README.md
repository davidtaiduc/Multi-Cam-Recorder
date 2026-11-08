# MultiCam Recorder — Team Base
Bộ khung phát triển cho bài tập Thu thập dữ liệu tập chuẩn AI. Có backend lưu dữ liệu thật, web Controller, app Remote, hợp đồng TypeScript, CI và tài liệu chia việc.

## Yêu cầu
Node.js 24 LTS + npm, Git. Camera/mobile cần điện thoại thật và Expo Go tương thích SDK 55 hoặc development build. Không cần cài database riêng. Phiên bản SDK được ghim để nhóm dùng đồng nhất; nếu Expo Go hiện tại không hỗ trợ thì dùng development build, không tự nâng riêng từng package.

## Chạy lần đầu (PowerShell hoặc Terminal, tại thư mục gốc)
```sh
npm ci
```
Copy apps/server/.env.example thành apps/server/.env. Đổi CONTROLLER_PASSWORD thành mật khẩu riêng ít nhất 12 ký tự; không commit .env.
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
Mở bằng Expo Go tương thích/development build. Tạo tài khoản Remote trên app, đăng nhập, nhập mã phòng, bật đồng ý, join. Bấm tải danh sách máy ở Controller. Base chưa tự sync.
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

## Trạng thái thực tế
Đã có đăng ký Remote tối thiểu, login/logout, Controller seed, tạo/join/rời phòng và danh sách máy. Token phiên opaque có hạn 1 giờ, chưa có JWT/refresh. Signup DEV chưa OTP và chưa đủ trường theo đề. Chưa quay video, QR, sync, upload, thư viện. Mobile chưa được xác minh bằng điện thoại thật trong môi trường này. Đọc docs trước khi bắt đầu module.
