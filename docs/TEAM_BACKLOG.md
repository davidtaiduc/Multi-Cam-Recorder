# Phân công đề xuất
| Người | Module | Đầu ra PR đầu tiên |
|---|---|---|
| A | Backend/Auth | OTP, phone/profile, refresh và test |
| B | Mobile/Camera | Permission camera/mic, preview, MP4 + thumbnail, kiểm tra storage |
| C | Controller/Room | QR, danh sách máy, giao diện lỗi/hết mã |
| D | Sync/Recording | DB command, device/room sync, chống trùng và ACK |
| E | Upload/QA | Upload resumable, test đa máy, hướng dẫn demo |
Nếu ít hơn 5 người, ghép C với A, E với D. Chưa gán tên vì chưa có danh sách nhóm.

## Definition of done
- Request/response thống nhất trong contracts + API docs.
- Không đổi role từ client, không truy cập video/phòng người khác.
- Có kiểm tra luồng chính và lỗi quan trọng; CI xanh.
- Camera/sync/upload có kết quả trên ít nhất 2 điện thoại thật.

## Mốc
Tuần 1: auth chuẩn + phòng; Tuần 2: camera + trạng thái; Tuần 3: command + Start/Stop; Tuần 4: upload; Tuần 5: library + tài khoản còn lại + báo cáo.
