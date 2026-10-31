import { Request, Response, NextFunction } from 'express';
import { BookingService, AppError } from '../services/bookingService';
import { resetDatabase } from '../db';

export class BookingController {
  /**
   * GET /api/tickets
   * Lấy danh sách vé và số lượng tồn kho
   */
  static getTickets(req: Request, res: Response) {
    const tickets = BookingService.getAllTickets();
    res.status(200).json({
      success: true,
      data: tickets
    });
  }

  /**
   * GET /api/bookings
   * Lấy danh sách các đơn đã đặt
   */
  static getBookings(req: Request, res: Response) {
    const bookings = BookingService.getAllBookings();
    res.status(200).json({
      success: true,
      data: bookings
    });
  }

  /**
   * POST /api/bookings
   * Nhận request: { ticketId, quantity }
   */
  static createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId, quantity } = req.body;
      const result = BookingService.createBooking({ ticketId, quantity });

      // Trả về đúng format theo yêu cầu đề bài kèm discountAmount và finalAmount
      res.status(201).json({
        success: true,
        bookingId: result.bookingId,
        totalAmount: result.totalAmount,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
        status: result.status,
        // Dữ liệu chi tiết đính kèm
        details: {
          ticketId: result.ticketId,
          ticketName: result.ticketName,
          unitPrice: result.unitPrice,
          quantity: result.quantity,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
          remainingStock: result.remainingStock,
          createdAt: result.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reset
   * Khôi phục dữ liệu ban đầu
   */
  static reset(req: Request, res: Response) {
    resetDatabase();
    res.status(200).json({
      success: true,
      message: 'Đã khôi phục dữ liệu mẫu ban đầu thành công.'
    });
  }
}
