# Hệ Thống Bán Vé Khu Vui Chơi (Wonderland Theme Park)

Hệ thống bán vé khu vui chơi giải trí trực tuyến được xây dựng với **Node.js**, **TypeScript**, **Express** và cơ sở dữ liệu **SQLite** (sử dụng ACID Transaction để chống thất thoát / âm tồn kho khi có giao dịch đồng thời).

---

## 1. Cấu Trúc Bảng Dữ Liệu (Database Schema)

### Bảng Vé (`tickets`)
| Cột | Kiểu Dữ Liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Mã vé định danh (1, 2) |
| `name` | TEXT | NOT NULL | Tên loại vé |
| `price` | INTEGER | NOT NULL | Giá vé niêm yết (VND) |
| `stock` | INTEGER | NOT NULL | Số lượng tồn kho khả dụng |
| `description`| TEXT | | Mô tả chi tiết trải nghiệm |

**Dữ liệu mẫu ban đầu theo đúng yêu cầu đề bài:**
- **Vé 1:** Giá **750.000đ** (750k) | Tồn kho: **5**
- **Vé 2:** Giá **650.000đ** (650k) | Tồn kho: **6**

### Bảng Đơn Đặt Vé (`bookings`)
| Cột | Kiểu Dữ Liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | TEXT PRIMARY KEY | Mã đơn hàng (ví dụ: `BK001`, `BK002`, ...) |
| `ticket_id` | INTEGER | Khóa ngoại tham chiếu `tickets(id)` |
| `ticket_name` | TEXT | Tên vé tại thời điểm đặt |
| `unit_price` | INTEGER | Đơn giá niêm yết trên Backend tại thời điểm đặt |
| `quantity` | INTEGER | Số lượng vé đặt |
| `total_amount` | INTEGER | Tổng tiền tính theo giá Backend (`unit_price * quantity`) |
| `status` | TEXT | Trạng thái đơn (`SUCCESS`) |
| `created_at` | DATETIME | Thời gian tạo đơn |

---

## 2. API Đặt Vé: `POST /api/bookings`

### Request Body:
```json
{
  "ticketId": 1,
  "quantity": 2
}
```

### Quy Trình Kiểm Tra (Validation Rules):
1. **Kiểm tra dữ liệu đầu vào:**
   - `ticketId` bắt buộc, phải là số nguyên dương hợp lệ.
   - `quantity` bắt buộc, không được âm (<= 0), không được là số thập phân.
2. **Kiểm tra vé tồn tại:**
   - Tra cứu trong cơ sở dữ liệu, nếu không tìm thấy -> Trả về mã lỗi `404 Not Found`.
3. **Kiểm tra tồn kho:**
   - Nếu `quantity > ticket.stock` -> Trả về mã lỗi `400 Bad Request` thông báo vượt quá số lượng tồn kho hiện tại.
4. **Tính toán tổng tiền & Chính sách giảm giá trên Backend:**
   - `totalAmount = ticket.price * quantity`.
   - **Chính sách ưu đãi:**
     - Nếu `totalAmount >= 1.000.000đ` (từ 1 triệu trở lên): Giảm 10% (`totalAmount * 0.10`).
     - Số tiền giảm tối đa là **200.000đ** (`discountAmount = Math.min(10%, 200.000đ)`).
     - Nếu `totalAmount < 1.000.000đ`: `discountAmount = 0`.
   - **Số tiền thanh toán cuối cùng:** `finalAmount = totalAmount - discountAmount`.
5. **Thực thi Transaction (ACID):**
   - Trừ số lượng tồn kho `stock = stock - quantity`.
   - Sinh mã đơn hàng tuần tự (`BK001`, `BK002`, ...).
   - Lưu bản ghi vào bảng `bookings` gồm cả `discount_amount` và `final_amount`.

---

## 3. Ví Dụ Kết Quả Phản Hồi

### ✅ Đặt vé thành công có giảm giá (HTTP 201):
```json
{
  "success": true,
  "bookingId": "BK001",
  "totalAmount": 1500000,
  "discountAmount": 150000,
  "finalAmount": 1350000,
  "status": "SUCCESS",
  "details": {
    "ticketId": 1,
    "ticketName": "Vé VIP Trọn Gói Khu Vui Chơi",
    "unitPrice": 750000,
    "quantity": 2,
    "discountAmount": 150000,
    "finalAmount": 1350000,
    "remainingStock": 3,
    "createdAt": "2026-10-31T03:34:11.000Z"
  }
}
```

### ❌ Số lượng vé âm (HTTP 400):
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "NEGATIVE_QUANTITY",
  "message": "Số lượng vé không được là số âm (phải lớn hơn 0)."
}
```

### ❌ Số lượng vượt quá tồn kho (HTTP 400):
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "EXCEEDS_STOCK",
  "message": "Số lượng vé yêu cầu (5) vượt quá số lượng tồn kho hiện tại (3)."
}
```

### ❌ Vé không tồn tại (HTTP 404):
```json
{
  "success": false,
  "statusCode": 404,
  "errorCode": "TICKET_NOT_FOUND",
  "message": "Không tìm thấy vé với ID 999. Vui lòng kiểm tra lại danh sách vé."
}
```

---

## 4. Các API Bổ Sung Hỗ Trợ

- `GET /api/tickets`: Lấy danh sách toàn bộ vé và tồn kho hiện tại.
- `GET /api/bookings`: Xem lịch sử các đơn hàng đã đặt.
- `POST /api/reset`: Khôi phục lại dữ liệu ban đầu (Vé 1: tồn 5, Vé 2: tồn 6).

---

## 5. Hướng Dẫn Chạy Dự Án

### Khởi động Backend:
```bash
cd BE
npm run dev
```
Server chạy tại: `http://localhost:5000`

### Mở Giao Diện Web Trực Quan:
Truy cập trực tiếp: `http://localhost:5000` trên trình duyệt.
Giao diện có sẵn các nút bấm thử nghiệm nhanh mọi kịch bản lỗi và thành công.
