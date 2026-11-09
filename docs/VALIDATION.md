# Kết quả kiểm tra Mốc 1 — 2026-11-08

## Đã chạy

Base trước sửa: 2 integration tests, typecheck và build web đều pass.
Sau triển khai, kiểm tra cuối bằng Node **24.22.2** (runtime tạm qua npm exec,
không đổi Node hệ thống):

- `npm test`: **11/11 pass**.
- `npm run typecheck`: Controller và Remote pass.
- `npm run build`: production Controller pass.
- `expo export --platform android`: Metro + Hermes bundle pass, 582 modules.
- `git diff --check`: pass; chỉ có thông báo chuẩn hóa CRLF của Git.

Node hệ thống trong phiên là 22.23.2; kiểm tra ban đầu và một lượt kiểm tra trung gian
chạy trên Node 22. Kiểm tra cuối đã chạy lại trên Node 24 mục tiêu.
Các test HTTP mở cổng loopback ngẫu nhiên, đóng server/connections sau test; không chạy
dev server. Bundle nằm trong `.codex-local/mobile-export`, chỉ dùng local.

## Hành vi được kiểm tra tự động

- Controller duy nhất, signup không cấp role Controller; role kiểm tra tại server.
- Profile, verified gate, OTP signup/forgot_password, cooldown, expiry, 5 attempts,
  single-use, sai purpose, không gửi giả khi thiếu adapter; DEV bị chặn production.
- Adapter nhận mã bằng test double; không có email/SMS thật được gửi.
- Multi-device, ownership, access expiry, refresh rotation và replay thu hồi family.
- Logout không hủy phiên thiết bị khác; reset password thu hồi toàn bộ phiên tài khoản.
- Consent boolean/string tại biên, device binding, join idempotency, sức chứa, invite
  expiry/renewal, thiết bị ở phòng khác, leave/logout xóa membership.
- Client gộp 10 request refresh đồng thời, chỉ retry một lần; network/503 giữ phiên,
  lỗi xác thực xóa phiên.
- DB v1 có user/session/room/member được migrate giữ dữ liệu; mở lại DB vẫn rotate được
  refresh. Schema migration chạy lại không thêm version hoặc mất membership.

## Chưa kiểm chứng và checklist nghiệm thu thật

Bundle không phải native build APK/IPA hoặc kiểm thử UI/điện thoại thật.
Chưa chạy camera, không có kết quả codec hoặc đồng bộ Start/Stop. Chưa tích hợp nhà cung
cấp email/SMS. Không coi unit test của client là bằng chứng SecureStore thật đã hoạt động.

Dùng hướng dẫn Windows trong README trên cùng LAN:

1. Seed Controller, login web, mở phòng và đọc QR bằng ứng dụng ngoài để đối chiếu mã.
2. Hai điện thoại: đăng ký hai tài khoản, gửi OTP DEV, xác thực và join với consent.
   Ghi model, OS, Expo SDK/build và mạng. Kiểm tra hai membership đúng device.
3. Dùng cùng một tài khoản trên hai điện thoại để kiểm tra multi-device độc lập.
4. Reload cùng tab Controller, restart Remote; thử lại sau 15 phút để kiểm tra refresh.
5. Ngắt Wi-Fi/server, xác nhận UI báo lỗi và không xóa phiên. Kết nối lại và thử thao tác.
6. Logout một điện thoại: máy kia vẫn dùng được. Leave thu hồi membership trên Controller.
7. Thử mã sai/hết hạn, thiếu consent và phòng đầy. Mở lại phòng để gia hạn invite.

Controller sessionStorage chỉ giữ reload cùng tab; đóng tab không được hứa tự đăng nhập.
Remote chưa có scanner QR; nhập mã thủ công. Mốc 2–5 chưa triển khai.

## Nâng SDK 58 — 2026-11-08

Baseline trước nâng: 11 tests, typecheck và build web pass. Nâng theo từng bước
55 → 56 → 57 → 58; Expo install --check và typecheck pass ở các bước trung gian.
Bộ cuối: Expo 58.0.23, React Native 0.88.1, React/ReactDOM 19.3.0,
expo-crypto 58.0.7, expo-secure-store 58.0.2, safe-area-context 5.11.1,
TypeScript mobile 6.0.3. Controller đồng bộ React/ReactDOM để hết duplicate React.

Kiểm tra cuối trên Node 24.22.2:

- `expo install --check`: dependencies up to date.
- `expo-doctor`: **20/20 pass**, không còn duplicate native module.
- `npm test`: **11/11 pass**.
- `npm run typecheck`: Controller và Remote pass.
- `npm run build`: Controller pass sau khi đồng bộ React.
- `expo export --platform ios`: Hermes bundle pass, 634 modules.
- `expo export --platform android`: Hermes bundle pass, 632 modules.
- `npm ci --dry-run --ignore-scripts --offline --no-audit --no-fund`: pass;
  đây là dry-run kiểm tra lock, không phải cài sạch hoặc native build.
- Dependency manifest/lock khớp cho root engine, Controller và Mobile.
- Smoke Metro tạm cổng 8082: manifest iOS trả HTTP 200, sdkVersion=58.0.0,
  tên MultiCam Remote và có launch asset. Tiến trình thử đã dừng, cổng được giải phóng.

Lượt smoke đầu dùng đồng thời --offline/--lan bị CLI từ chối; bỏ --lan thì chạy được.
PowerShell trả body application/expo+json dưới dạng byte[]; decode UTF-8 để kiểm tra
manifest. Hai lỗi kiểm tra này không cần sửa mã ứng dụng.

`npm audit`: 5 moderate trong chuỗi Expo CLI/fingerprint/glob/minimatch, không high/critical.
Audit đề xuất quay về Expo 57; không áp dụng downgrade hoặc audit fix --force vì trái
mục tiêu SDK 58. Chi tiết audit chỉ lưu local, không chứa credential.

Chưa cài native build, chưa chạy trực tiếp trên iPhone. Người dùng cần khởi động lại
web (React thay đổi), chạy dev:mobile:clear và quét QR mới bằng iPhone với Expo Go SDK 58.
Giữ nguyên .env, DB và SecureStore keys; kiểm tra lại auth/OTP/join trên LAN theo README.

## Giao diện đăng ký Remote dễ đọc — 2026-11-08

Tách tab đăng nhập/đăng ký và bước OTP riêng; thêm nhãn, xác nhận mật khẩu, hiện/ẩn mật
khẩu, validation trước gửi và lỗi ngay trong form. Signup chuyển sang verify trước khi
gửi OTP để lỗi gửi không khiến người dùng tạo tài khoản trùng. Có đếm ngược resend và
lối tiếp tục xác thực tài khoản đã đăng ký. KeyboardAvoidingView/scroll hỗ trợ iPhone.
Không đổi API, dependency hoặc dữ liệu lưu phiên. Test hiện có 11/11 và build web pass;
typecheck cả hai client pass sau sửa JSX. Cần thử UI và bàn phím/OTP thực tế trên iPhone.

Bundle iOS Hermes cho giao diện mới: pass, 635 modules; export kết thúc và worker đã thoát.

## Mốc 2A — Camera và clip cục bộ

Remote SDK 58 dùng `expo-camera`, `expo-file-system`, `expo-video`,
`expo-image-manipulator` và `expo-sharing`. Clip nằm trong `Paths.document/recordings`.
Mỗi lần quay dùng UUID riêng và định danh `local-test`. Giới hạn quay thử là 60 giây
hoặc 150 MB mỗi clip. App yêu cầu còn tối thiểu 500 MB trước khi bắt đầu quay.

### Kiểm tra tự động trên Windows

- Node 24.22.2. `npm test` qua 11/11, `npm run typecheck` và `npm run build` đều qua.
- `node --test apps/mobile/test/videoContainer.test.mjs` qua 3/3 với hộp MP4/QuickTime
  giả lập, dữ liệu thiếu và tên camera chứa ký tự đường dẫn.
- `expo install --check` xác nhận dependency tương thích. Expo Doctor qua 20/20.
- `expo export --platform ios` qua 681 modules, Android qua 678 modules. Đây là
  kiểm tra bundle Hermes, còn chạy native trên iPhone và Android chờ nghiệm thu.

### Checklist trên iPhone

1. Khởi động lại Metro bằng lệnh trong README và mở QR mới trong Expo Go SDK 58.
   Đăng nhập Remote, chưa cần vào phòng. Mở **Camera và clip cục bộ**.
2. Cấp camera và micro, xác nhận có preview. Thử từ chối một quyền trong lần thử riêng,
   kiểm tra thông báo, nút thử lại và **Mở Cài đặt**. Bật lại quyền rồi quay lại app.
3. Đổi camera trước/sau. Quay 5–10 giây, nói vài câu, kiểm tra bộ đếm và nút đổi camera
   bị khóa trong lúc quay. Bấm **Dừng quay** và chờ **Đã lưu**. Kiểm tra ảnh thu nhỏ
   hoặc thông báo thiếu ảnh nếu trích khung hình thất bại.
4. Bấm **Mở clip**, phát và kiểm tra hình, tiếng, tua. Đóng rồi mở lại app, vào màn hình
   camera và phát lại chính clip đó để kiểm tra lưu qua khởi động lại.
5. Thử quay rồi bấm **Quay lại**, hoặc đưa app vào nền. Khi quay lại, kiểm tra app đã
   kết thúc ghi, báo kết quả lưu hoặc lỗi rõ ràng, và có thể mở preview/quay lại.
6. Thử quay cục bộ khi đã join phòng. Kiểm tra phòng và quyền điều khiển giữ nguyên.

### Kiểm tra file thực tế

App đọc các hộp container và brand của file do camera tạo trước khi đặt đuôi, sau đó
kiểm tra file tại thư mục đích. Expo Camera SDK 58 trên iOS tạo tệp `.mov` theo mã nguồn
native của phiên bản cài đặt. Nếu byte cho thấy QuickTime, app giữ `.mov`. App lưu `.mp4`
khi nhận dạng được brand MP4 và cấu trúc chứa dữ liệu media. Kiểm tra này phân loại
container, còn tính phát được của mọi mẫu và codec cần kiểm tra trên clip thật.

Mở clip, chọn **Chia sẻ tệp để kiểm tra**, lưu vào Files và chép tệp gốc sang Windows.
Nếu máy có `ffprobe`, chạy với đường dẫn của clip đã chép.

```powershell
ffprobe -v error -show_entries format_tags=major_brand,compatible_brands:stream=codec_type,codec_name -of json "C:\path\to\clip.mov"
ffprobe -v trace -show_format "C:\path\to\clip.mov" 2>&1 | Select-String "type:'(moof|mvex)'"
```

| Mục | Kết quả hiện tại và cách xác nhận |
|---|---|
| Container MP4 | Bộ phân loại đã qua test với mẫu tổng hợp. Cần `major_brand` của clip thật. `qt` là QuickTime. `format_name` của ffprobe có thể liệt kê nhiều định dạng cùng họ. |
| Video H.264 | App yêu cầu `avc1` trên iOS. Cần xác nhận stream video có `codec_name: h264`. |
| Âm thanh AAC | App bật thu micro. Cần xác nhận stream audio có `codec_name: aac` và nghe thử. |
| Fragmented MP4 | Bộ đọc phát hiện `moof` trong mẫu tổng hợp. Expo Camera chưa bảo đảm đầu ra phân mảnh. Kiểm tra `moof` ở cấp gốc và `mvex` trong `moov` trên clip MP4 thật. |

Tham khảo [Expo Camera SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/camera/),
[FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) và
[Expo Video](https://docs.expo.dev/versions/v58.0.0/sdk/video/).
