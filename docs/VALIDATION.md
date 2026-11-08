# Kiểm tra bản base
- Node 24.22.1.
- npm test: 2 integration tests pass; gồm phân quyền, multi-device, consent, device binding, join idempotency, room expiry, token expiry, logout, SQLite persistence và single Controller.
- npm run typecheck: Controller và Mobile pass.
- npm run build: production web Controller pass.
- Expo export Android: Metro + Hermes bundle pass (không phải build APK).
- Chưa chạy UI trên thiết bị Android/iOS thật, chưa native build APK/IPA, chưa kiểm tra camera vì chưa triển khai.

Trước khi nhận base: làm theo README, tạo Controller, đăng ký 2 Remote trên 2 điện thoại; join, tải danh sách, rời phòng. Người kiểm thử ghi model máy, OS, SDK build, mạng và kết quả vào PR.
