import { db } from '../db';
import { Ticket, BookingRequest, BookingResponse } from '../types';

export class AppError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BookingService {

  static getAllTickets(): Ticket[] {
    const stmt = db.prepare('SELECT id, name, price, stock, description FROM tickets ORDER BY id ASC');
    return stmt.all() as Ticket[];
  }

  /**
   * Lấy thông tin vé theo ID
   */
  static getTicketById(ticketId: number): Ticket | undefined {
    const stmt = db.prepare('SELECT id, name, price, stock, description FROM tickets WHERE id = ?');
    return stmt.get(ticketId) as Ticket | undefined;
  }

  /**
   * Lấy danh sách tất cả các đơn đặt vé đã thực hiện
   */
  static getAllBookings() {
    const stmt = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC');
    return stmt.all();
  }

  static createBooking(data: BookingRequest): BookingResponse {
    // --- 1. Kiểm tra đầu vào (Validation) ---
    if (data.ticketId === undefined || data.ticketId === null || data.ticketId === '') {
      throw new AppError(400, 'INVALID_TICKET_ID', 'ticketId là bắt buộc và không được để trống.');
    }

    const numericTicketId = Number(data.ticketId);
    if (!Number.isInteger(numericTicketId) || numericTicketId <= 0) {
      throw new AppError(400, 'INVALID_TICKET_ID', 'ticketId phải là số nguyên dương hợp lệ.');
    }

    if (data.quantity === undefined || data.quantity === null) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Số lượng vé (quantity) là bắt buộc.');
    }

    const numericQuantity = Number(data.quantity);

    // Kiểm tra vé không được âm và phải là số nguyên dương
    if (isNaN(numericQuantity)) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Số lượng vé (quantity) phải là một số.');
    }

    if (numericQuantity < 0) {
      throw new AppError(400, 'NEGATIVE_QUANTITY', 'Số lượng vé không được là số âm (phải lớn hơn 0).');
    }

    if (numericQuantity === 0) {
      throw new AppError(400, 'ZERO_QUANTITY', 'Số lượng vé đặt phải tối thiểu là 1 vé.');
    }

    if (!Number.isInteger(numericQuantity)) {
      throw new AppError(400, 'NOT_INTEGER_QUANTITY', 'Số lượng vé đặt phải là số nguyên (không được là số thập phân).');
    }

    // Sử dụng Database Transaction để đảm bảo tính toàn vẹn (ACID)
    const transaction = db.transaction(() => {
      // --- 2. Kiểm tra vé có tồn tại hay không ---
      const ticket = BookingService.getTicketById(numericTicketId);
      if (!ticket) {
        throw new AppError(
          404,
          'TICKET_NOT_FOUND',
          `Không tìm thấy vé với ID ${numericTicketId}. Vui lòng kiểm tra lại danh sách vé.`
        );
      }

      // --- 3. Kiểm tra số lượng không vượt quá số lượng tồn kho ---
      if (numericQuantity > ticket.stock) {
        throw new AppError(
          400,
          'EXCEEDS_STOCK',
          `Số lượng vé yêu cầu (${numericQuantity}) vượt quá số lượng tồn kho hiện tại (${ticket.stock}).`
        );
      }

      // --- 4. Tổng tiền tính theo giá lưu trên BE ---
      const totalAmount = ticket.price * numericQuantity;

      const DISCOUNT_THRESHOLD = 1000000;
      const DISCOUNT_RATE = 0.10; 
      const MAX_DISCOUNT = 200000;

      let discountAmount = 0;
      if (totalAmount >= DISCOUNT_THRESHOLD) {
        const rawDiscount = Math.round(totalAmount * DISCOUNT_RATE);
        discountAmount = Math.min(rawDiscount, MAX_DISCOUNT);
      }

      // Tiền thanh toán thực tế sau khi trừ giảm giá
      const finalAmount = totalAmount - discountAmount;

      // Sinh mã đơn hàng dạng BK001, BK002, ...
      const countRow = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };
      const nextIndex = countRow.count + 1;
      const bookingId = `BK${String(nextIndex).padStart(3, '0')}`;

      // --- 5. Trừ tồn kho ---
      const updateStmt = db.prepare(`
        UPDATE tickets
        SET stock = stock - ?
        WHERE id = ? AND stock >= ?
      `);

      const updateResult = updateStmt.run(numericQuantity, numericTicketId, numericQuantity);
      if (updateResult.changes === 0) {
        throw new AppError(
          409,
          'CONCURRENCY_CONFLICT',
          'Tồn kho vé vừa thay đổi hoặc không đủ để hoàn tất giao dịch. Vui lòng thử lại.'
        );
      }

      // Lưu đơn đặt vào bảng bookings (kèm discount_amount và final_amount)
      const insertBooking = db.prepare(`
        INSERT INTO bookings (id, ticket_id, ticket_name, unit_price, quantity, total_amount, discount_amount, final_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')
      `);

      insertBooking.run(
        bookingId,
        ticket.id,
        ticket.name,
        ticket.price,
        numericQuantity,
        totalAmount,
        discountAmount,
        finalAmount
      );

      const remainingStock = ticket.stock - numericQuantity;

      return {
        bookingId,
        totalAmount,
        discountAmount,
        finalAmount,
        status: 'SUCCESS' as const,
        ticketId: ticket.id,
        ticketName: ticket.name,
        unitPrice: ticket.price,
        quantity: numericQuantity,
        remainingStock,
        createdAt: new Date().toISOString()
      };
    });

    return transaction();
  }
}
