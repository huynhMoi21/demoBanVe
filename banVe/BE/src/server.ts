import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import { apiRouter } from './routes/api';
import { AppError } from './services/bookingService';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Phục vụ giao diện Frontend tĩnh
app.use(express.static(path.resolve(__dirname, '../../FE')));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Khởi tạo Database
initDatabase();

// Đăng ký API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// Middleware xử lý lỗi tập trung (Error Handler)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      message: err.message
    });
  }

  // Xử lý lỗi JSON body không hợp lệ (Bad JSON format)
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      errorCode: 'INVALID_JSON_BODY',
      message: 'Định dạng JSON gửi lên không hợp lệ.'
    });
  }

  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    success: false,
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'Đã xảy ra lỗi nội bộ trên hệ thống máy chủ.'
  });
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 Server bán vé khu vui chơi đang chạy tại:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Endpoint API: http://localhost:${PORT}/api/bookings`);
  console.log(`   Endpoint Danh sách vé: http://localhost:${PORT}/api/tickets`);
  console.log(`================================================`);
});
