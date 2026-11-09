# Kiến trúc — Mốc 1

Controller React/Vite và Remote Expo gọi API Node.js trên máy Controller trong LAN.
Server dùng SQLite tích hợp node:sqlite; không có cloud hoặc ORM. Node mục tiêu là 24 LTS.

## Module

- `app.mjs`: HTTP dispatch, envelope, CORS và giới hạn auth theo IP.
- `middleware/http.mjs`: lỗi API, kiểm tra JSON object, giới hạn payload và chuỗi.
- `routes/auth.mjs`: signup, OTP, verify, login, refresh, logout, reset và users/me.
- `routes/rooms.mjs`: tạo/mở phòng, join, members và leave.
- `services/otp.mjs`: purpose, expiry, cooldown, attempts, single-use và delivery adapter.
- `services/sessions.mjs`: access/refresh, rotation và family revocation.
- `repositories/users.mjs`: profile projection và device ownership.
- `database.mjs`: schema và migration phiên bản 1 → 2, có transaction.
- `packages/contracts`: DTO và HTTP client dùng chung, có storage adapter cho mỗi nền tảng.

Quyền luôn dựa vào role và device lấy từ session + user trong DB. Unique index giữ
một Controller. Public signup luôn tạo Remote chưa xác thực; không nhận role client.
Thiết bị đăng ký gắn với tài khoản; nhiều thiết bị có các phiên độc lập. device_id là
installation identifier, không phải hardware attestation. UUID không thay thế bearer token.

## Phiên và dữ liệu nâng cấp

Access opaque có hạn 15 phút; refresh 30 ngày với rotation và phát hiện reuse.
DB chỉ giữ hash token. Rotate vô hiệu access cũ bằng expires_at=0 để các request cũ
đang đồng thời nhận ACCESS_EXPIRED và dùng refresh đã gộp ở client. Logout/reuse thu hồi
family; logout cũng xóa membership của thiết bị. Leave xóa membership, thu hồi consent.
Reset password thu hồi toàn bộ phiên/membership của tài khoản đó.

Migration bổ sung profile/verified cho users, session_id cho sessions, devices,
refresh_sessions, refresh_tokens và otp_challenges. Không drop bảng hoặc xóa dữ liệu cũ.
Tài khoản legacy giữ verified=1 và profile trống, tránh khóa người dùng hiện có.
Legacy token giữ hạn cũ và cần login lại để có refresh. Thiết bị legacy sở hữu duy nhất
được backfill; dữ liệu device_id xung đột bị chặn khi đăng nhập, không tự ghi đè.
Backup DB trước nâng cấp; chạy server/seed sẽ tự migrate đúng DB_PATH.
Chưa có tác vụ dọn token hết hạn; dữ liệu rotation được giữ để phát hiện replay.

Web lưu phiên trong sessionStorage (reload cùng tab còn phiên; đóng tab cần login).
Device ID cũng theo tab. Mobile lưu cả bộ token trong một entry SecureStore, giữ UUID
cài đặt; bỏ token key legacy khi khởi tạo. Lỗi mạng và 5xx không xóa phiên. Shared client
gộp refresh đồng thời, chỉ replay một lần và không refresh cho sai mật khẩu hay OTP.

## OTP và phòng

OTP mặc định không gửi được khi chưa cấu hình adapter; không có dịch vụ email/SMS giả.
DEV_OTP_ENABLED phải bật rõ ràng để trả mã trong response; production từ chối DEV.
Mã 6 số, TTL 5 phút, resend 120 giây, tối đa 5 lần thử và chỉ dùng một lần theo purpose.

Phòng mở duy nhất cho Controller; invite 6 ký tự, TTL 10 phút, tối đa 8 thiết bị.
Mở lại phòng có mã hết hạn sẽ gia hạn; không tạo phòng trùng. Join cần consent thật,
kiểm tra device và ownership, không cho thiết bị thuộc hai phòng. QR tạo local trên
Controller bằng qrcode, chứa mã thuần; Remote nhập mã, chưa quét QR. Danh sách thủ công.

## Phạm vi và giới hạn

Chưa triển khai Mốc 2–5: camera, sync, command, upload và thư viện. Chưa native build
hoặc kiểm thử hai điện thoại thật. HTTP LAN chỉ dành dữ liệu test; chưa TLS/deploy public.
Web storage có thể bị đọc bởi JavaScript cùng origin; cần bảo vệ XSS khi mở rộng UI.
OTP send qua adapter được kiểm thử giả lập interface, chưa tích hợp nhà cung cấp thật.
Quên mật khẩu có API và test, UI tài khoản còn lại để mốc sau.

Giữ các câu hỏi cho các mốc sau: LAN/3G khi demo, độ lệch Start/Stop cho phép và yêu cầu
fragmented MP4. Polling không bảo đảm đồng bộ chính xác; codec cần đo trên thiết bị.

## Nâng Remote lên Expo SDK 58

Nâng theo từng bước 55 → 56 → 57 → 58; dùng Expo CLI đồng bộ bộ dependency ở mỗi bước.
Remote dùng Expo 58.0.23, React Native 0.88.1 / React 19.3.0 theo bundledNativeModules của SDK 58.
Controller cũng dùng React/ReactDOM 19.3.0 để workspace chỉ có một bản React.
SecureStore và Crypto dùng API hiện có với package tương thích SDK 58; giữ nguyên key
lưu phiên và device UUID, không đổi API backend hay schema DB.
SafeAreaView chuyển từ React Native core sang react-native-safe-area-context, đặt trong
SafeAreaProvider để xử lý vùng notch/home indicator trên iPhone. Không thêm Expo Router,
không phát triển camera/sync/upload trong lần nâng SDK này.
Node dự án vẫn là 24 LTS, nâng yêu cầu tối thiểu lên 24.3 cho Expo tooling SDK 58.
Không có ios/android native project được sinh hoặc xóa. Windows chỉ kiểm tra bundle iOS;
native iOS build vẫn cần môi trường Apple/EAS. Dùng dev:mobile:clear sau nâng để bỏ cache
Metro SDK cũ; không tự đổi IP LAN hoặc credential trong .env.
