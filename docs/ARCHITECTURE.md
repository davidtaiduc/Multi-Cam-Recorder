# Kiến trúc base
Controller React/Vite và Remote Expo gọi cùng API Node.js trên máy Controller trong LAN. API ghi SQLite; chưa có dịch vụ cloud. Máy Controller chạy cả server và giao diện web. Hai điện thoại gọi IP LAN của máy, không dùng localhost.

## Quyết định hiện tại
- Node 24 LTS, SQLite tích hợp node:sqlite; không cần database server khi khởi động.
- Backend dùng ESM JavaScript; client và hợp đồng dùng TypeScript. Không có ORM hoặc Express để tránh thêm tầng chưa cần thiết.
- Phiên: opaque bearer token ngẫu nhiên, DB chỉ lưu SHA-256, hạn 1 giờ; chưa phải JWT/refresh flow cuối của đề. Mỗi login gắn device_id riêng, không đá máy khác.
- Controller duy nhất được seed; unique index bảo đảm DB không có hai Controller. Signup bỏ qua mọi role client gửi, luôn Remote.
- Web giữ token trong bộ nhớ; reload cần login lại. Mobile giữ token bằng SecureStore.
- POST join bắt buộc grant_control=true, device_id phải thuộc phiên. Membership ở mức thiết bị.
- Quy trình auth hiện là DEV: chưa xác thực email/SMS, thiếu first_name/last_name/phone; chưa đạt đầy đủ Tuần 1.
- Không có WebSocket. Sync/command/upload là module chờ, không trả dữ liệu giả thành công.

## Mở rộng theo thứ tự
1. Auth chuẩn đề: profile/phone, OTP purpose + expiry, reset password, refresh rotation, logout/revoke; migrations nâng cấp DB.
2. Tách app.mjs thành routes/auth, routes/rooms, services, repositories khi nhóm bắt đầu mở rộng.
3. Device sync + room revision; lưu last_seen, pin/dung lượng; giới hạn poll theo next_sync_in.
4. recording_sessions + commands; idempotency command_id, TTL 30 giây, ACK, sai lệch đồng bộ phải đo trên máy thật.
5. uploads + video metadata; chunk checksum, retry/resume, ownership, giới hạn dung lượng.

## Những điểm cần hỏi giảng viên
- LAN hay điện thoại 3G/4G khi bảo vệ?
- Sai lệch Start/Stop được chấp nhận bao nhiêu? Poll 3–5 giây không bảo đảm đồng thời chính xác.
- Upload trong lúc quay hay sau Stop? Base ưu tiên sau Stop.
- Theo Tuần 2: chỉ Remote tự lật camera.
- Expo Camera là điểm bắt đầu; fragmented MP4 H.264/AAC phải kiểm chứng trên thiết bị. Có thể cần native module nếu SDK không đáp ứng; base chưa cam kết format/codec.

## Giới hạn
Chưa public deployment; HTTP LAN chỉ dùng dữ liệu test. Chưa có TLS, password reset, xử lý background camera, QR, quay, upload, tải/xóa video. Không coi base là sản phẩm hoàn chỉnh.
