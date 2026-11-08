# Quy ước làm việc
- Nhánh main luôn phải chạy được; tạo nhánh feat/auth, feat/camera, feat/sync, feat/upload, fix/...
- Không push trực tiếp main. Trên GitHub, trưởng nhóm bật bảo vệ main và yêu cầu CI + 1 người review (chưa cấu hình tự động).
- Mỗi PR giải quyết một phần việc; pull main trước khi mở PR, không force push main.
- Chỉnh hợp đồng trong packages/contracts và docs/API.md trước khi đổi request/response. Báo cho người làm client.
- Không commit .env, token, database thật, video thật hoặc mật khẩu.
- Cài bằng npm ci sau khi có lockfile. Không trộn npm/yarn/pnpm.
- Backend: apps/server/src; Controller: apps/controller; Mobile: apps/mobile; shared DTO: packages/contracts.
- Thành viên camera không sửa auth; thành viên upload không đổi cấu trúc command mà chưa thống nhất.
- Chỉ PR sau khi chạy test, typecheck, build; thay đổi camera phải ghi kết quả trên máy thật.
