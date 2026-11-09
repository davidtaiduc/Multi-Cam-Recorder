QUY TẮC PHÁT TRIỂN VÀ KẾT THÚC PHIÊN

Đây là dự án nhóm MultiCam Recorder. Chỉ làm việc trên mã nguồn local trong phạm vi được yêu cầu.

1. Quy tắc Git
- Không tự chạy git add, git commit, git push, tạo pull request,
  merge hoặc thay đổi repository trên GitHub.
- Chỉ thực hiện các thao tác đó khi tôi yêu cầu rõ ràng.
- Được đọc git status, git diff và git log để kiểm tra công việc.
- Giữ nguyên thay đổi chưa commit của các thành viên.
- Không tự stash, reset, clean, checkout đè hoặc xóa thay đổi.

2. Khi tôi nhắn “ngừng phát triển hôm nay”
Đây là lệnh kết thúc phiên. Thực hiện ngay:

- Ngừng triển khai tính năng, sửa mã và khởi chạy kiểm thử mới.
- Dừng các tác vụ và tác nhân phụ do bạn tạo.
- Kết thúc những tiến trình thuộc dự án do bạn khởi chạy:
  dev server, backend, Vite, Metro/Expo, watcher, test watch,
  build đang chạy và tác vụ nền.
- Dừng cả tiến trình con liên quan; không chỉ đóng terminal
  mà để tiến trình con tiếp tục chạy.
- Nếu đã khởi chạy container riêng cho phiên này, dừng đúng
  container đó; không xóa volume hoặc dữ liệu.
- Không kết thúc tất cả tiến trình node, python, Java hoặc Docker
  trên máy. Không dừng ứng dụng hoặc dịch vụ của thành viên khác.
- Ưu tiên dừng nhẹ nhàng; chỉ buộc dừng khi đã xác định chính xác
  tiến trình thuộc phiên này và nó không thoát.
- Giữ lại mã nguồn và dữ liệu local. Không thực hiện bất kỳ
  thao tác ghi nào lên Git/GitHub.

3. Ghi nhận để tiếp tục
- Lưu ngắn gọn tiến độ vào .codex-local/SESSION.md:
  phần đã làm, file đã sửa, kiểm tra đã chạy, phần còn dở
  và bước tiếp theo.
- Thư mục .codex-local/ chỉ dùng local. Thêm đường dẫn này vào
  .git/info/exclude, không thêm vào .gitignore của nhóm.
- Nếu đường dẫn này đã được Git theo dõi, không ghi vào đó;
  chọn một vị trí local chưa được theo dõi.
- Không ghi mật khẩu, token hoặc thông tin bí mật.

4. Xác minh đã dừng
- Theo dõi PID, cổng và tiến trình bạn khởi chạy trong phiên.
- Sau khi dừng, kiểm tra các tiến trình/cổng tương ứng.
- Báo rõ những gì đã dừng và những gì chưa xác minh được.
- Không tuyên bố đã dừng hết nếu không có khả năng kiểm tra.
- Sau báo cáo kết thúc, không tiếp tục gọi công cụ, chạy nền,
  tự khởi động lại server hoặc tiếp tục phát triển.
- Chỉ tiếp tục khi tôi gửi yêu cầu mới.

5. Khi bắt đầu phiên tiếp theo
- Đọc .codex-local/SESSION.md nếu có, rồi kiểm tra git status.
- Tiếp tục từ công việc còn dở.
- Chỉ khởi động dịch vụ cần thiết cho yêu cầu hiện tại.