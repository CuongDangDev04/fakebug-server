# Social Network Server

Đây là backend API cho dự án **Social Network**, được xây dựng với [NestJS](https://nestjs.com) và TypeScript. Backend cung cấp các API phục vụ cho ứng dụng mạng xã hội: xác thực, quản lý người dùng, bài viết, bình luận, bạn bè, nhắn tin, thông báo, v.v.

## Chức năng chính

- Đăng ký, đăng nhập, xác thực JWT
- Quản lý hồ sơ người dùng (profile)
- Đăng bài viết, hình ảnh
- Bình luận, thích (like), chia sẻ bài viết
- Kết bạn, quản lý danh sách bạn bè
- Nhắn tin trực tiếp (real-time chat qua WebSocket)
- Thông báo (notifications)
- Tìm kiếm người dùng, bài viết
- Phân quyền, bảo mật API

## Cấu trúc thư mục

- `src/`
  - `entities/` - Các entity tạo bảng trong databasse
  - `modules/` - Các module chính: user, auth, post, comment, friend, message, notification, v.v.
  - `common/` - Các thành phần dùng chung (guards, interceptors, filters, decorators)
  - `config/` - Cấu hình kết nối nodemailer
  - `main.ts` - Điểm khởi động ứng dụng

## Yêu cầu

- Node.js >= 18
- MySQL 8.xx
- Cấu hình biến môi trường `.env`

## Hướng dẫn cài đặt & chạy

1. **Cài đặt dependencies:**

   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường:**

   Tạo file `.env` dựa trên file mẫu `.env.example`


3. **Chạy server:**

   ```bash
   # Chạy chế độ phát triển
   npm run start:dev

   # Hoặc chạy production
   npm run build
   npm run start:prod
   ```

4. **Kiểm tra API:**
   - Mặc định API chạy ở `http://localhost:5001` (hoặc port bạn cấu hình).
   - Có thể dùng Postman, Swagger UI (`/api` ) để test API.

## Kết nối với frontend

- Đảm bảo backend chạy trước khi sử dụng frontend.
- Cấu hình endpoint API trong frontend (`.env` của client) trỏ về địa chỉ backend này.

## Chạy test

```bash
# Unit test
npm run test

# E2E test
npm run test:e2e

# Kiểm tra coverage
npm run test:cov
```

## Tài liệu tham khảo

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM](https://typeorm.io) hoặc [Mongoose](https://mongoosejs.com) (tùy ORM)
- [Socket.IO](https://socket.io/) (nếu dùng real-time chat)

---

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
