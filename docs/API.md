# API base v0.1
Base URL http://<IP-LAN>:3000. JSON request, Authorization: Bearer <token>.
Response: {code:"1000",message:"OK",data:...}; lỗi dùng HTTP status và data:null. Kiểu số/boolean dùng JSON chuẩn; khác các ví dụ string số trong slide, cần thống nhất khi mở rộng.

| Method | Path | Quyền | Hiện trạng |
|---|---|---|---|
| GET | /health | Public | DB/app đã khởi động |
| POST | /auth/signup | Public | email,password; luôn Remote; DEV bỏ qua OTP |
| POST | /auth/login | Public | email,password,device_id; trả user,account_role,access_token,expires_in |
| POST | /auth/logout | Đã login | Thu hồi token hiện tại |
| GET | /users/me | Đã login | Hồ sơ tối thiểu và device_id |
| POST | /rooms | Controller | Trả phòng mở hiện tại hoặc tạo; mã hết hạn 10 phút, tối đa 8 máy |
| POST | /rooms/join | Remote | invite_code,device_id,camera_name,grant_control:true; gọi lại không tạo trùng |
| GET | /rooms/{id}/members | Chủ phòng | Danh sách máy ban đầu, chưa phân trang |
| POST | /rooms/{id}/leave | Remote trong phiên | Rời bằng device_id của phiên |

Các API còn lại trong đề chưa triển khai. /videos*, đường dẫn chứa /sync hoặc /recording trả 501 sau xác thực. Các route còn lại chưa có trả 404.
Mã lỗi: 400 validation, 401 thiếu/hết phiên, 403 sai quyền/thiết bị, 404 không tìm thấy, 409 trùng/phòng đầy, 413 payload lớn, 429 rate limit, 501 chưa triển khai.

Ví dụ: POST /auth/login
```json
{"email":"controller@example.test","password":"your-local-password","device_id":"controller-laptop"}
```
Không lưu bearer token trong log hoặc commit collection chứa credential.
