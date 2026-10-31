import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';

export const apiRouter = Router();

// Lấy danh sách vé & tồn kho
apiRouter.get('/tickets', BookingController.getTickets);

// Lấy lịch sử đơn hàng
apiRouter.get('/bookings', BookingController.getBookings);

// API POST /api/bookings theo yêu cầu
apiRouter.post('/bookings', BookingController.createBooking);

// Alias cho /api/booking phòng khi client gọi số ít
apiRouter.post('/booking', BookingController.createBooking);

// API Reset dữ liệu về ban đầu để kiểm thử
apiRouter.post('/reset', BookingController.reset);
